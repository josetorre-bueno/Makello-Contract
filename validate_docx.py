#!/usr/bin/env python3
"""validate_docx.py — sanity-check a .docx for structural problems.

Performs:
  - Zip integrity (CRC, no missing entries)
  - Presence of required OOXML parts ([Content_Types].xml, _rels/.rels,
    word/document.xml)
  - XML well-formedness of every .xml / .rels file inside
  - Tag-balance scan that mirrors docxtemplater's tagMatcher (catches a
    "<" without a matching ">" before the next "<", same check that produced
    the v0.4.7 "An XML file has invalid xml" error)
  - Heuristic checks for known Word-incompatible patterns

Usage:  python3 validate_docx.py file1.docx [file2.docx ...]
Exit:   0 if all files clean, 1 if any file has an issue.
"""

import zipfile, sys, re
import xml.etree.ElementTree as ET

REQUIRED = ['[Content_Types].xml', '_rels/.rels', 'word/document.xml']

OOXML_NS = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def tag_match_scan(content: str, filename: str) -> list:
    """Mirror docxtemplater's tagMatcher (docxtemplater.js:1546-1556): for every
    '<', confirm a '>' appears before the next '<'."""
    issues = []
    i = 0
    while True:
        i = content.find('<', i)
        if i == -1:
            break
        j = content.find('>', i)
        k = content.find('<', i + 1)
        if j == -1 or (k != -1 and k < j):
            ctx = content[max(0, i - 60):i + 60]
            issues.append(f'{filename} offset {i}: unbalanced "<", context: {ctx!r}')
            i = i + 1
        else:
            i = j + 1
    return issues


def heuristic_checks(content: str, filename: str) -> list:
    """Look for patterns Word/docxtemplater specifically rejects."""
    issues = []
    # Empty <w:body> would be unusual but valid; multiple <w:body> is invalid
    body_count = len(re.findall(r'<w:body\b', content))
    if filename.endswith('document.xml') and body_count != 1:
        issues.append(f'{filename}: expected exactly one <w:body>, found {body_count}')
    # Unclosed <w:r>, <w:p>, <w:t> would have been caught by ET.parse but log
    # mismatched-tag counts as a defensive sanity check.
    for tag in ('w:r', 'w:p', 'w:t', 'w:rPr', 'w:pPr', 'w:tbl', 'w:tr', 'w:tc'):
        opens  = len(re.findall(rf'<{tag}\b[^/]*>(?!\s*</)', content))  # rough
        closes = len(re.findall(rf'</{tag}>', content))
        # Self-closing also possible — don't enforce strict counts. Just flag
        # very large mismatches.
        if opens > 0 and closes > 0 and abs(opens - closes) > opens * 0.5:
            issues.append(f'{filename}: large open/close imbalance on <{tag}> '
                          f'(opens~{opens}, closes={closes})')
    # Attributes appearing inside text content (broken open tag) — would have
    # been caught by ET.parse already, but check anyway.
    return issues


def validate(path: str) -> list:
    issues = []
    try:
        with zipfile.ZipFile(path) as z:
            bad = z.testzip()
            if bad:
                issues.append(f'Bad CRC in {bad}')
            names = z.namelist()
    except zipfile.BadZipFile as e:
        return [f'Not a valid zip: {e}']
    except Exception as e:
        return [f'Could not open as zip: {e}']

    for req in REQUIRED:
        if req not in names:
            issues.append(f'Missing required part: {req}')

    with zipfile.ZipFile(path) as z:
        for name in names:
            if not (name.endswith('.xml') or name.endswith('.rels')):
                continue
            try:
                data = z.read(name)
            except Exception as e:
                issues.append(f'{name}: could not read — {e}')
                continue
            try:
                ET.fromstring(data)
            except ET.ParseError as e:
                line, col = e.position
                text = data.decode('utf-8', errors='replace').split('\n')
                ctx_line = text[line - 1] if 0 < line <= len(text) else ''
                start = max(0, col - 80)
                end   = min(len(ctx_line), col + 80)
                issues.append(
                    f'{name}: XML parse error at line {line} col {col}: {e}\n'
                    f'    context: …{ctx_line[start:end]}…\n'
                    f'    {" " * (col - start)}^'
                )
                continue

            content = data.decode('utf-8', errors='replace')
            issues.extend(tag_match_scan(content, name))
            issues.extend(heuristic_checks(content, name))

    return issues


def main() -> int:
    if len(sys.argv) < 2:
        print('usage: validate_docx.py file.docx [...]', file=sys.stderr)
        return 2
    any_bad = False
    for path in sys.argv[1:]:
        print(f'\n=== {path} ===')
        issues = validate(path)
        if not issues:
            print('  ✓ no issues found')
        else:
            any_bad = True
            for issue in issues:
                print(f'  ✗ {issue}')
    return 1 if any_bad else 0


if __name__ == '__main__':
    sys.exit(main())
