#!/usr/bin/env python3
"""
highlight_placeholders.py — apply peach (#FFC080) shading to every {{placeholder}}
in a .docx template so they stand out when editing the template in Word.

The peach shading is an editing aid only. The Makello Contract Tool's JSX
(contract_tool_app_v0.6.3+) strips all peach-colored <w:shd> at template
ingestion, so this shading never appears in generated contracts.

Usage:
    python3 highlight_placeholders.py
        Processes both Wipomo_Contract_Template.docx and
        Wipomo_Contract_Template_Battery.docx in the current directory.

    python3 highlight_placeholders.py file1.docx file2.docx
        Processes the given files.

Behavior:
- Walks every word/*.xml part of each .docx.
- One-time migration: strips every <w:shd .../> inside <w:pPr>...</w:pPr> of
  any paragraph containing a {{placeholder}}. This removes the legacy whole-
  paragraph shading (typically FFD966 / FFE599) that earlier manual edits
  applied to call attention to placeholders. The new convention is run-level
  peach only.
- Finds every <w:r> run whose visible text contributes to any {{placeholder}}.
  Word's spell-check often splits a placeholder across several runs; this
  script catches every run that participates, by reconstructing concatenated
  text and mapping character ranges back to runs.
- Replaces any existing <w:shd .../> on those runs with the peach shading.
- Idempotent: a run already carrying peach is left untouched.
- Validates the resulting XML before writing the new docx.
- Re-zips preserving each file's original compression method.
"""

import zipfile, shutil, re, sys, os
import xml.etree.ElementTree as ET

PEACH = 'FFC080'
SHD_TAG = f'<w:shd w:val="clear" w:color="auto" w:fill="{PEACH}"/>'

RUN_RE = re.compile(r'<w:r\b[^>]*>.*?</w:r>', re.DOTALL)
T_RE   = re.compile(r'<w:t[^>]*>([^<]*)</w:t>')
RPR_RE = re.compile(r'<w:rPr>(.*?)</w:rPr>', re.DOTALL)
SHD_RE = re.compile(r'<w:shd\b[^/]*/>')
R_OPEN = re.compile(r'(<w:r\b[^>]*>)')
PH_RE  = re.compile(r'\{\{[^}]+\}\}')
P_RE   = re.compile(r'<w:p\b[^>]*>.*?</w:p>', re.DOTALL)
PPR_RE = re.compile(r'<w:pPr\b[^>]*>.*?</w:pPr>', re.DOTALL)
# Runs that contain non-text elements (tabs, line breaks, fields, drawings,
# etc.) can't be safely split into <w:rPr> + <w:t>-only sub-runs — we'd lose
# the inline element. For those runs we fall back to whole-run shading.
COMPLEX_RUN_RE = re.compile(
    r'<w:(?:tab|br|noBreakHyphen|softHyphen|sym|drawing|object|fldChar|instrText|pict|ruby|smartTag)\b'
)


def inject_peach(run_body: str) -> str:
    """Replace any <w:shd .../> in this run with the peach shading. If no
    <w:rPr>, create one. Used for whole-run shading (entire run text is the
    placeholder, or the run is too complex to safely split)."""
    run_body = SHD_RE.sub('', run_body)
    rpr = RPR_RE.search(run_body)
    if rpr:
        new_rpr = '<w:rPr>' + rpr.group(1) + SHD_TAG + '</w:rPr>'
        return run_body[:rpr.start()] + new_rpr + run_body[rpr.end():]
    m = R_OPEN.match(run_body)
    if m:
        return m.group(1) + '<w:rPr>' + SHD_TAG + '</w:rPr>' + run_body[m.end():]
    return run_body


def split_run(body: str, text: str, local_phs: list) -> str:
    """Split a <w:r>...</w:r> into multiple sibling <w:r>s. Placeholder
    segments get peach shading; surrounding text segments get the original
    run properties without shading. Used when a placeholder doesn't span the
    whole run text, so that ONLY the placeholder characters are highlighted,
    not the surrounding text in the same run."""
    open_m = R_OPEN.match(body)
    r_open = open_m.group(1) if open_m else '<w:r>'

    rpr_m = RPR_RE.search(body)
    if rpr_m:
        # Strip any existing shading from the source rPr; we'll re-add peach
        # only to the placeholder sub-runs.
        inner = SHD_RE.sub('', rpr_m.group(1))
        rpr_plain = f'<w:rPr>{inner}</w:rPr>' if inner.strip() else ''
        rpr_peach = f'<w:rPr>{inner}{SHD_TAG}</w:rPr>'
    else:
        rpr_plain = ''
        rpr_peach = f'<w:rPr>{SHD_TAG}</w:rPr>'

    # Build alternating outside/inside segments
    segments = []
    pos = 0
    for ls, le in sorted(local_phs):
        if pos < ls:
            segments.append((text[pos:ls], False))
        segments.append((text[ls:le], True))
        pos = le
    if pos < len(text):
        segments.append((text[pos:], False))

    # Always emit xml:space="preserve" on the new <w:t> so leading/trailing
    # whitespace in "Name: " etc. isn't collapsed.
    parts = []
    for seg_text, is_ph in segments:
        if not seg_text:
            continue
        rpr = rpr_peach if is_ph else rpr_plain
        parts.append(f'{r_open}{rpr}<w:t xml:space="preserve">{seg_text}</w:t></w:r>')
    return ''.join(parts)


def transform_run(body: str, text: str, text_start: int, placeholders: list) -> str:
    """Decide how to shade a single run:
    - If no placeholder touches the run: no change.
    - If the entire run text is one placeholder: whole-run peach (or no-op if
      it already has peach).
    - If the run contains inline elements other than <w:rPr> + <w:t>
      (tab/break/field/drawing/...): whole-run peach as a safe fallback.
      Splitting would drop those inline elements.
    - Otherwise (mixed text + placeholder in a simple text run): split into
      sub-runs and peach only the placeholder segment(s)."""
    local_phs = []
    text_end = text_start + len(text)
    for gs, ge in placeholders:
        if gs >= text_end or ge <= text_start:
            continue
        ls = max(0, gs - text_start)
        le = min(len(text), ge - text_start)
        if ls < le:
            local_phs.append((ls, le))

    if not local_phs:
        return body

    if len(local_phs) == 1 and local_phs[0] == (0, len(text)):
        return body if f'w:fill="{PEACH}"' in body else inject_peach(body)

    if COMPLEX_RUN_RE.search(body):
        # Can't safely split — fall back to whole-run shading.
        return body if f'w:fill="{PEACH}"' in body else inject_peach(body)

    return split_run(body, text, local_phs)


def strip_paragraph_shading(content: str) -> tuple[str, int]:
    """Strip every <w:shd .../> inside <w:pPr>...</w:pPr> of paragraphs that
    contain a {{placeholder}}. These are legacy "highlight the whole paragraph"
    markers from earlier manual editing of the templates (typically FFD966 /
    FFE599). The new convention is run-level peach on placeholder runs only,
    so the paragraph-mark shading is no longer wanted."""
    stripped = 0
    def clean_paragraph(p_match):
        nonlocal stripped
        p_body = p_match.group(0)
        if '{{' not in p_body:
            return p_body
        def clean_ppr(ppr_match):
            nonlocal stripped
            ppr_body = ppr_match.group(0)
            new_body = SHD_RE.sub('', ppr_body)
            if new_body != ppr_body:
                stripped += 1
            return new_body
        return PPR_RE.sub(clean_ppr, p_body)
    return P_RE.sub(clean_paragraph, content), stripped


def process_xml(content: str) -> tuple[str, int]:
    """Return (new_content, changes_count)."""
    # Pre-pass: strip legacy paragraph-mark shading from paragraphs containing
    # placeholders. One-time migration from the prior manual-yellow convention.
    content, p_stripped = strip_paragraph_shading(content)

    runs = []
    full_text = ''
    for m in RUN_RE.finditer(content):
        body = m.group(0)
        run_text = ''.join(tm.group(1) for tm in T_RE.finditer(body))
        runs.append({
            'span':       (m.start(), m.end()),
            'text_span':  (len(full_text), len(full_text) + len(run_text)),
            'body':       body,
            'text':       run_text,
        })
        full_text += run_text

    placeholders = [(m.start(), m.end()) for m in PH_RE.finditer(full_text)]
    if not placeholders:
        return content, p_stripped

    affected = set()
    for ph_start, ph_end in placeholders:
        for i, r in enumerate(runs):
            ts, te = r['text_span']
            if ts < ph_end and te > ph_start:
                affected.add(i)

    out = content
    changed = 0
    # Walk backwards so earlier-run offsets aren't shifted by later replacements.
    for i in sorted(affected, reverse=True):
        r = runs[i]
        new_body = transform_run(r['body'], r['text'], r['text_span'][0], placeholders)
        if new_body != r['body']:
            s, e = r['span']
            out = out[:s] + new_body + out[e:]
            changed += 1
    return out, changed + p_stripped


def word_lock_path(docx_path: str) -> str:
    """Return the Word owner-file ("~$") path that would exist if Word had
    this docx open. Word's convention: the lock filename is '~$' + the
    original basename with its first two characters dropped (for names
    longer than 2 chars). For a filename like 'Wipomo_Contract_Template.docx'
    the lock is '~$pomo_Contract_Template.docx'."""
    d = os.path.dirname(docx_path)
    base = os.path.basename(docx_path)
    lock_base = '~$' + (base[2:] if len(base) > 2 else base)
    return os.path.join(d, lock_base)


def is_locked_by_word(docx_path: str) -> bool:
    return os.path.exists(word_lock_path(docx_path))


def check_all_unlocked(paths: list) -> bool:
    """Return True only if every path is currently NOT open in Word. Prints a
    clear message listing all locked files so the user can close them in one
    pass before retrying — vs. discovering them one at a time on each run."""
    locked = [(p, word_lock_path(p)) for p in paths if is_locked_by_word(p)]
    if not locked:
        return True
    print('\n✗ Refusing to run — these files are currently open in Word:')
    for p, lock in locked:
        print(f'    {p}    (lock: {os.path.basename(lock)})')
    print('\nClose them in Word (Cmd+Q to quit Word fully on macOS), then re-run.')
    print('If the lock files persist after Word is closed, you can delete them')
    print('manually — they are leftovers from a crash.')
    return False


def process_file(path: str) -> bool:
    print(f'\n{path}')
    if not os.path.exists(path):
        print('  ✗ not found')
        return False

    tmp = path + '.tmp'
    total = 0
    with zipfile.ZipFile(path, 'r') as zin, zipfile.ZipFile(tmp, 'w') as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename.startswith('word/') and item.filename.endswith('.xml'):
                text = data.decode('utf-8')
                new_text, n = process_xml(text)
                if n:
                    try:
                        ET.fromstring(new_text)
                    except ET.ParseError as e:
                        print(f'  ✗ {item.filename}: produced invalid XML — {e}')
                        os.unlink(tmp)
                        return False
                    data = new_text.encode('utf-8')
                    total += n
                    print(f'  {item.filename}: peach applied to {n} run(s)')
            zout.writestr(item, data)
    shutil.move(tmp, path)
    print(f'  ✓ {total} run(s) shaded total')
    return True


def main() -> int:
    targets = sys.argv[1:] or [
        'Wipomo_Contract_Template.docx',
        'Wipomo_Contract_Template_Battery.docx',
    ]
    # Pre-flight: refuse if any target is currently open in Word. Modifying a
    # docx while Word holds it produces a stale-handle scenario where Word's
    # saves write to an orphaned inode, silently dropping the user's edits.
    if not check_all_unlocked(targets):
        return 2
    ok = all(process_file(t) for t in targets)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
