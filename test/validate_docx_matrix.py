#!/usr/bin/env python3
# Wipomo Contract Tool — generated-docx validator (matrix harness companion)
# Version: v0.7.0
# Updated: 2026-06-03 12:48 PT
# Part of: Makello Contract Tool
#
# Validates every .docx in a directory produced by contract_matrix_test.mjs.
# The filename encodes the settings combo, e.g.:
#   type=pv_battery__guarantee=on__addendum=on__clean=off.docx
# Checks, per file:
#   1. Every word/*.xml is well-formed.
#   2. numbering.xml schema order — ALL <w:abstractNum> precede ALL <w:num>
#      (the v0.6.7 addendum-merge bug class).
#   3. No peach editing-aid shading (w:fill="FFC080") leaks into output.
#   4. Yellow highlight presence matches the clean flag (clean=on -> none).
#   5. Addendum content presence matches the addendum flag.
#   6. Battery clauses presence matches the contract type.
#   7. Production Guarantee + Exhibit C presence matches the guarantee flag (v0.7.0).
#   8. No leftover docxtemplater tags ("{{") in the rendered document (v0.7.0).
import sys, os, re, zipfile
import xml.etree.ElementTree as ET

def parse_combo(name):
    # filename like: type=pv_battery__addendum=on__clean=off.docx
    combo = {}
    for part in name.replace('.docx', '').split('__'):
        if '=' in part:
            k, v = part.split('=', 1)
            combo[k] = v
    return combo

def check(path):
    name = os.path.basename(path)
    combo = parse_combo(name)
    z = zipfile.ZipFile(path)
    doc = z.read('word/document.xml').decode('utf-8')
    num = z.read('word/numbering.xml').decode('utf-8') if 'word/numbering.xml' in z.namelist() else ''
    results = []

    # 1. well-formed
    bad = []
    for n in z.namelist():
        if n.startswith('word/') and n.endswith('.xml'):
            try: ET.fromstring(z.read(n))
            except ET.ParseError as e: bad.append(f"{n}: {e}")
    results.append(("xml well-formed", not bad, "; ".join(bad) or "all parts parse"))

    # 2. numbering order
    if num:
        seq = [m.group(1) for m in re.finditer(r'<w:(abstractNum|num)\b', num)]
        first_num = seq.index('num') if 'num' in seq else len(seq)
        viol = [i for i, t in enumerate(seq) if t == 'abstractNum' and i > first_num]
        results.append(("numbering schema order", not viol,
                        "all abstractNum before num" if not viol else f"abstractNum after num at {viol}"))
    else:
        results.append(("numbering schema order", True, "no numbering.xml"))

    # 3. no peach
    peach = any(re.search(r'w:fill="FFC080"', z.read(n).decode('utf-8','replace'), re.I)
                for n in z.namelist() if n.startswith('word/') and n.endswith('.xml'))
    results.append(("no peach shading", not peach, "clean" if not peach else "FFC080 present!"))

    # 4. highlight vs clean flag
    hi = doc.count('<w:highlight w:val="yellow"/>')
    if combo.get('clean') == 'on':
        ok = hi == 0
        results.append(("highlight matches clean=on", ok, f"{hi} highlights (expect 0)"))
    else:
        ok = hi > 0
        results.append(("highlight matches clean=off", ok, f"{hi} highlights (expect >0)"))

    # 5. addendum content vs flag — "Indemnified Parties" is addendum-only
    # (verified absent from both main templates; "mechanics" is NOT usable, it
    # appears in the base contract's own lien language).
    add_marker = 'Indemnified Parties' in doc
    want_add = combo.get('addendum') == 'on'
    results.append(("addendum matches flag", add_marker == want_add,
                    f"addendum content {'present' if add_marker else 'absent'} (want {'present' if want_add else 'absent'})"))

    # 6. battery content vs type
    batt = 'Battery Storage System' in doc
    want_batt = combo.get('type') == 'pv_battery'
    results.append(("battery matches type", batt == want_batt,
                    f"battery clauses {'present' if batt else 'absent'} (want {'present' if want_batt else 'absent'})"))

    # 7. production guarantee + Exhibit C vs guarantee flag (v0.7.0)
    guar = ('Production Guarantee' in doc) and ('Annual Production Potential' in doc)
    want_guar = combo.get('guarantee') == 'on'
    results.append(("guarantee matches flag", guar == want_guar,
                    f"guarantee content {'present' if guar else 'absent'} (want {'present' if want_guar else 'absent'})"))

    # 8. no leftover docxtemplater tags (all sections/loops/placeholders rendered)
    leftover = doc.count('{{')
    results.append(("no leftover {{ tags", leftover == 0, f"{leftover} leftover '{{{{' (expect 0)"))

    return name, results

def main(d):
    files = sorted(f for f in os.listdir(d) if f.endswith('.docx'))
    if not files:
        print(f"No .docx files in {d}"); return 1
    total_fail = 0
    for f in files:
        name, results = check(os.path.join(d, f))
        nfail = sum(1 for _, ok, _ in results if not ok)
        total_fail += nfail
        flag = "✅ PASS" if nfail == 0 else f"❌ {nfail} FAIL"
        print(f"\n{flag}  {name}")
        for label, ok, detail in results:
            print(f"    {'✓' if ok else '✗'} {label}: {detail}")
    print(f"\n{'='*60}")
    print(f"{len(files)} files checked — {'ALL PASS ✅' if total_fail==0 else str(total_fail)+' checks FAILED ❌'}")
    return 1 if total_fail else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else '/tmp/harness_out'))
