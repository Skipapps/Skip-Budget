"""Builds .claude/team/design/loan-upload-mock.html: one self-contained page of phone frames.

Screens are drawn at the Founder's 390pt width and shown at 300px with CSS zoom, so every size in
the markup is the spec's point value.
"""
import base64
import re
import sys
from pathlib import Path

REPO = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[4]
GEN = Path(__file__).resolve().parent
REF = REPO / '.claude/team/design/reference/loan-redesign'
FONTS = REPO / 'node_modules/@expo-google-fonts/montserrat'
OUT = REPO / '.claude/team/design/loan-upload-mock.html'

_svg_counter = [0]


def gradient_svg(path: Path, size: int) -> str:
    """Inline one of the Founder's gradient SVGs, ids made unique so many can share the page."""
    _svg_counter[0] += 1
    p = f'g{_svg_counter[0]}_'
    s = path.read_text()
    s = re.sub(r'id="([^"]+)"', lambda m: f'id="{p}{m.group(1)}"', s)
    s = re.sub(r'url\(#([^)]+)\)', lambda m: f'url(#{p}{m.group(1)})', s)
    s = re.sub(r'href="#([^"]+)"', lambda m: f'href="#{p}{m.group(1)}"', s)
    return s.replace('<svg ', f'<svg width="{size}" height="{size}" aria-hidden="true" ', 1)


def icon(name: str, dark: bool, size: int) -> str:
    mine = {'loan-file', 'loan-file-problem', 'loan-file-reading', 'loan-file-checked'}
    folder = GEN if name in mine else REF
    suffix = '-dark-icon.svg' if dark else '-icon.svg'
    return gradient_svg(folder / f'{name}{suffix}', size)


# Lucide 1.x glyphs (24 viewBox, 2px stroke), the set the app already draws with.
LUCIDE = {
    'chev-r': '<path d="m9 18 6-6-6-6"/>',
    'chev-d': '<path d="m6 9 6 6 6-6"/>',
    'chev-l': '<path d="M15 19 8 12l7-7"/>',
    'pencil': '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    'lock': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    'ok': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    'alert': '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    'dashed': '<path d="M10.1 2.182a10 10 0 0 1 3.8 0"/><path d="M13.9 21.818a10 10 0 0 1-3.8 0"/><path d="M17.609 3.721a10 10 0 0 1 2.69 2.7"/><path d="M2.182 13.9a10 10 0 0 1 0-3.8"/><path d="M20.279 17.609a10 10 0 0 1-2.7 2.69"/><path d="M21.818 10.1a10 10 0 0 1 0 3.8"/><path d="M3.721 6.391a10 10 0 0 1 2.7-2.69"/><path d="M6.391 20.279a10 10 0 0 1-2.69-2.7"/>',
    'user-ok': '<path d="M2 21a8 8 0 0 1 13.292-6"/><circle cx="10" cy="8" r="5"/><path d="m16 19 2 2 4-4"/>',
    'camera': '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    'file': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    'bank': '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
    'eye': '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    'backspace': '<path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="m12 9 6 6"/><path d="m18 9-6 6"/>',
    'check': '<path d="M20 6 9 17l-5-5"/>',
    'phone': '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
    'list': '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    'cloud-off': '<path d="m2 2 20 20"/><path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193"/><path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07"/>',
}


def lu(name: str, size: int = 18, color: str = 'currentColor', sw: float = 2) -> str:
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            f'{LUCIDE[name]}</svg>')


def font_faces() -> str:
    faces = []
    for weight, folder, name in [(400, '400Regular', 'Montserrat_400Regular'),
                                 (500, '500Medium', 'Montserrat_500Medium'),
                                 (600, '600SemiBold', 'Montserrat_600SemiBold'),
                                 (700, '700Bold', 'Montserrat_700Bold')]:
        data = base64.b64encode((FONTS / folder / f'{name}.ttf').read_bytes()).decode()
        faces.append(f"@font-face{{font-family:'SkipMont';font-weight:{weight};font-style:normal;"
                     f"src:url(data:font/ttf;base64,{data}) format('truetype')}}")
    return '\n'.join(faces)


CSS = r"""
*{box-sizing:border-box}
body{margin:0;background:#E9E5E0;font-family:'SkipMont',-apple-system,BlinkMacSystemFont,sans-serif;color:#111;-webkit-font-smoothing:antialiased}
.intro{max-width:1240px;padding:30px 30px 6px}
.intro h1{font-size:26px;font-weight:700;margin:0 0 6px}
.intro p{font-size:13.5px;line-height:1.55;color:#3a3a3a;margin:6px 0;max-width:980px}
.legend{display:flex;flex-wrap:wrap;gap:10px 18px;margin:14px 0 4px;padding:14px 16px;background:#fff;border-radius:14px;max-width:980px;border:1px solid #DDD7D0}
.legend div{font-size:12.5px;color:#333;display:flex;align-items:center;gap:8px}
.board{display:flex;flex-wrap:wrap;gap:34px 26px;padding:10px 30px 36px;align-items:flex-start;max-width:1400px}
.group{width:100%;border-top:1px solid #D2CBC3;padding-top:20px;margin-top:8px}
.group h2{font-size:20px;font-weight:700;margin:0 0 4px}
.group p{font-size:13px;color:#4a4a4a;margin:0;max-width:980px;line-height:1.55}
.cell{width:300px;flex:none}
.cap{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:0 0 8px 2px}
.cap b{font-size:13.5px;font-weight:600}
.tag{font-size:10.5px;padding:2px 8px;border-radius:99px;background:#F3E9EF;color:#905479;font-weight:600}
.tag.d{background:#2A2634;color:#F8F6FB}
.tag.s{background:#FFF;color:#555;box-shadow:inset 0 0 0 1px #D6D0C9}
.tag.w{background:#F6EEDF;color:#7A5008}
.fnote{font-size:11.5px;color:#555;margin:8px 2px 0;line-height:1.5}

/* The phone. Sizes inside are points at 390pt wide. */
.phone{width:390px;zoom:0.769231;border-radius:50px;overflow:hidden;position:relative;display:flex;flex-direction:column;background:var(--surface);color:var(--ink);box-shadow:0 0 0 1.3px #C9C2BA,0 10px 30px rgba(0,0,0,.10)}
.phone.vp{height:844px}
.phone.tall{min-height:844px}
.light{--surface:#FBF9F7;--card:#FFFFFF;--ink:#111111;--body:#2F2F2F;--muted:#6F6F6F;--line:#E5E1DC;--accent:#905479;--accent-ink:#905479;--tint:rgba(144,84,121,.10);--ok:#2F7A55;--ok-t:rgba(47,122,85,.08);--warn:#93600A;--warn-t:rgba(147,96,10,.08);--danger:#B0453A;--ink5:rgba(17,17,17,.05);--me:#905479;--kb:#D1D4DA;--kbkey:#FFFFFF;--scrim:rgba(0,0,0,.40)}
.dark{--surface:#1B181F;--card:#2A2634;--ink:#F8F6FB;--body:#E4E0EA;--muted:#A7A1B2;--line:#3E3949;--accent:#905479;--accent-ink:#A67694;--tint:rgba(144,84,121,.18);--ok:#7FD6A0;--ok-t:rgba(127,214,160,.14);--warn:#F0B44C;--warn-t:rgba(240,180,76,.14);--danger:#F08A86;--ink5:rgba(248,246,251,.06);--me:#C79AB6;--kb:#2C2C2E;--kbkey:#58585C;--scrim:rgba(0,0,0,.55)}
.sb{height:47px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:8px 28px 0 36px;font-weight:600;font-size:16px;letter-spacing:-.2px}
.sbi{display:flex;gap:6px;align-items:center}
.hd{height:52px;flex:none;display:flex;align-items:center;padding:0 16px;position:relative}
.back{width:40px;height:40px;border-radius:50%;background:var(--card);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--ink);flex:none}
.hd .t{position:absolute;left:72px;right:72px;text-align:center;font-weight:600;font-size:17px;line-height:22px}
.sub{font-size:13px;line-height:19px;color:var(--muted);text-align:center;padding:2px 34px 6px}
.sc{flex:1;padding:12px 20px 18px;overflow:hidden;display:flex;flex-direction:column}
.tall .sc{overflow:visible}
.card{background:var(--card);border:1px solid var(--line);border-radius:20px}
.sh{display:flex;align-items:center;gap:10px;margin:30px 0 12px}
.sh span{font-weight:600;font-size:17px}
.ft{flex:none;border-top:1px solid var(--line);padding:14px 20px 30px;background:var(--surface);display:flex;flex-direction:column;gap:6px}
.bp{min-height:56px;border-radius:999px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:500;font-size:17px;padding:0 20px;text-align:center}
.bo{min-height:56px;border-radius:999px;border:1px solid var(--accent);color:var(--ink);display:flex;align-items:center;justify-content:center;font-weight:500;font-size:17px}
.bt{min-height:44px;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--muted)}
.hint{font-size:13px;color:var(--danger);text-align:center;line-height:18px;padding:0 6px 4px}
.muted{color:var(--muted)}
.info{display:flex;gap:8px;align-items:flex-start;margin-top:12px;padding:0 4px;font-size:12px;line-height:17px;color:var(--muted)}
.info svg{flex:none;margin-top:1.5px}
/* calculator pieces, after the Founder's PNGs */
.lc{display:flex;align-items:center;gap:14px;padding:16px 18px}
.lc .tx{flex:1;min-width:0}
.lc .t1{font-weight:600;font-size:15px;line-height:20px}
.lc .t2{font-size:12px;color:var(--muted);margin-top:2px;line-height:16px}
.lc .end{display:flex;align-items:center;gap:6px;color:var(--muted);flex:none}
.pro{background:var(--accent);color:#fff;font-weight:700;font-size:9px;letter-spacing:.3px;border-radius:999px;padding:2px 7px}
.row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:16px 18px;border-top:1px solid var(--line)}
.row:first-child{border-top:0}
.row .l{font-size:14px;color:var(--muted)}
.row .v{font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px}
.sl{padding:16px 18px 8px;border-top:1px solid var(--line)}
.sl:first-child{border-top:0}
.slt{display:flex;justify-content:space-between;align-items:center}
.chipv{background:var(--surface);border-radius:12px;padding:8px 14px;font-weight:600;font-size:17px}
.track{height:4px;border-radius:2px;background:var(--line);margin:22px 0 16px;position:relative}
.fill{position:absolute;left:0;top:0;bottom:0;background:var(--accent);border-radius:2px}
.thumb{position:absolute;top:50%;width:26px;height:26px;border-radius:50%;background:var(--card);border:3px solid var(--accent);transform:translate(-50%,-50%)}
.res{padding:20px}
.sum{display:flex;justify-content:space-between;align-items:center;font-size:14px;margin-top:12px}
.sum .k{display:flex;gap:8px;align-items:center;color:var(--muted)}
.dot{width:8px;height:8px;border-radius:50%}
/* review */
.hero{padding:18px 18px 16px}
.hrow{display:flex;gap:14px;align-items:flex-start}
.hk{font-size:12px;color:var(--muted);line-height:16px}
.ht{font-size:20px;font-weight:700;line-height:26px;margin-top:3px}
.hsep{height:1px;background:var(--line);margin:14px 0 4px}
.hl{display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:18px;color:var(--body);margin-top:8px}
.hl svg{flex:none;margin-top:0}
.wb{border-radius:14px;background:var(--warn-t);padding:12px 14px;margin-top:14px;display:flex;gap:10px;align-items:flex-start}
.wb svg{flex:none;margin-top:1px}
.wb .w1{font-size:14px;font-weight:600;line-height:19px}
.wb .w2{font-size:13px;line-height:19px;color:var(--body);margin-top:3px}
.rr{padding:15px 18px 16px;border-top:1px solid var(--line)}
.rr:first-child{border-top:0}
.r1{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:24px}
.rl{font-size:13px;color:var(--muted);line-height:17px}
.r2{display:flex;align-items:center;gap:8px;margin-top:5px}
.vals{flex:1;min-width:0;display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px}
.soft{font-size:15px;color:var(--ink)}
.old{font-size:15px;color:var(--muted)}
.arr{color:var(--muted);font-size:15px}
.new{font-size:17px;font-weight:600;line-height:22px}
.pen{width:44px;height:44px;margin:-11px -12px -11px auto;display:flex;align-items:center;justify-content:center;color:var(--muted);flex:none}
.src{font-size:12px;color:var(--muted);margin-top:6px;display:flex;gap:6px;align-items:flex-start;line-height:16px}
.src svg{flex:none;margin-top:1px}
.nt{font-size:13px;color:var(--body);margin-top:10px;line-height:18px}
.acts{display:flex;gap:10px;margin-top:12px;align-items:center}
.use{height:36px;padding:0 16px;border:1px solid var(--accent);border-radius:999px;font-size:14px;font-weight:600;display:flex;align-items:center;color:var(--ink)}
.st{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:4px 9px 4px 7px;border-radius:999px;white-space:nowrap;line-height:16px}
.st.ok{color:var(--ok);background:var(--ok-t)}
.st.chk{color:var(--warn);background:var(--warn-t)}
.st.nf{color:var(--muted);box-shadow:inset 0 0 0 1px var(--line)}
.st.as{color:var(--muted);background:var(--ink5)}
.st.me{color:var(--me);background:var(--tint)}
.tiles{display:flex;gap:12px;margin-top:12px}
.tile{flex:1;min-height:54px;border:1px solid var(--line);border-radius:16px;background:var(--card);display:flex;align-items:center;justify-content:space-between;padding:0 12px 0 14px;font-weight:600;font-size:15px;position:relative;overflow:hidden}
.radio{width:22px;height:22px;border-radius:50%;border:1.5px solid var(--muted);flex:none;display:flex;align-items:center;justify-content:center}
.tile.sel{border:1.5px solid var(--accent);background:linear-gradient(var(--tint),var(--tint)),var(--card)}
.tile.sel .radio{background:var(--accent);border-color:var(--accent);color:#fff}
.ck{padding:16px 18px}
.ck .ct{font-weight:600;font-size:15px}
.cl{display:flex;gap:10px;align-items:flex-start;margin-top:14px}
.cl svg{flex:none;margin-top:1px}
.cl .a{font-size:14px;font-weight:600;line-height:19px}
.cl .b{font-size:13px;color:var(--muted);line-height:18px;margin-top:1px}
/* upload page */
.tip{display:flex;gap:14px;align-items:flex-start;padding:15px 18px;border-top:1px solid var(--line)}
.tip:first-child{border-top:0}
.tip svg{flex:none;margin-top:1px}
.tip .a{font-size:15px;font-weight:600;line-height:20px}
.tip .b{font-size:12px;color:var(--muted);line-height:16px;margin-top:2px}
.soon{border:1px solid var(--line);color:var(--muted);font-size:11px;font-weight:600;border-radius:999px;padding:3px 9px;white-space:nowrap}
.sq{width:38px;height:38px;border-radius:12px;background:var(--surface);display:flex;align-items:center;justify-content:center;color:var(--muted);flex:none;border:1px solid var(--line)}
/* centred states */
.mid{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 12px}
.mt{font-size:22px;font-weight:700;line-height:29px;margin-top:22px}
.mb{font-size:15px;line-height:22px;color:var(--muted);margin-top:10px}
.bar{height:8px;border-radius:999px;background:var(--line);width:260px;position:relative;overflow:hidden;margin-top:18px}
.bar i{position:absolute;left:0;top:0;bottom:0;background:var(--accent);border-radius:999px}
/* fields and keyboard */
.fl{font-weight:600;font-size:14px;margin:18px 0 8px}
.field{height:56px;border-radius:16px;background:var(--card);border:1px solid var(--line);display:flex;align-items:center;padding:0 4px 0 16px;font-size:16px}
.field .ph{color:var(--muted);flex:1}
.field.err{border:1.5px solid var(--danger)}
.eye{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--muted)}
.caret{width:2px;height:22px;background:var(--accent);margin-right:2px}
.kb{height:291px;flex:none;background:var(--kb);display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--muted)}
.keys{display:grid;grid-template-columns:repeat(3,1fr);gap:10.5px}
.key{height:64px;border-radius:16px;background:var(--ink5);display:flex;align-items:center;justify-content:center;font-size:26px}
/* overlays */
.toastw{position:absolute;left:0;right:0;bottom:126px;display:flex;justify-content:center;padding:0 24px}
.toast{background:var(--ink);color:var(--surface);border-radius:999px;padding:10px 20px 10px 10px;display:flex;gap:10px;align-items:center;font-weight:600;font-size:15px;box-shadow:0 10px 24px rgba(0,0,0,.22)}
.toast .i{width:24px;height:24px;border-radius:50%;background:#2FA46B;display:flex;align-items:center;justify-content:center}
.scrim{position:absolute;inset:0;background:var(--scrim);display:flex;align-items:center;justify-content:center;padding:0 32px}
.dlg{background:var(--card);border-radius:16px;width:100%;max-width:340px;overflow:hidden}
.dlg .dt{font-weight:600;font-size:17px;line-height:24px;padding:20px 20px 0}
.dlg .dm{font-size:15px;line-height:24px;color:var(--body);padding:8px 20px 16px}
.dlg .db{display:flex;gap:10px;padding:4px 20px 20px}
.dlg .db div{flex:1;min-height:42px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:15px}
.ex{display:flex;flex-direction:column;align-items:center;text-align:center}
.excircle{width:104px;height:104px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff}
.exchip{margin-top:24px;border:1px solid var(--line);background:var(--card);border-radius:999px;padding:10px 16px;font-size:13px;color:var(--muted)}
.ext{font-size:28px;font-weight:700;line-height:36px;margin-top:30px}
.exs{font-size:15px;line-height:24px;color:var(--muted);margin-top:8px}
.exp{width:100%;margin-top:34px;display:flex;flex-direction:column;gap:20px;padding:0 8px;text-align:left}
.exp div{display:flex;gap:16px;align-items:center;font-size:15px}
/* large text: the multipliers are TEXT_CAP's (row 1.4, control 1.3, reading 1.6, heading 1.3) */
.lt .rl{font-size:18.2px;line-height:24px}
.lt .old{font-size:21px}.lt .arr{font-size:21px}
.lt .new{font-size:23.8px;line-height:30px}
.lt .src{font-size:16.8px;line-height:22px}
.lt .st{font-size:15.6px;line-height:20px;padding:5px 11px 5px 9px}
.lt .nt{font-size:20.8px;line-height:28px}
.lt .use{font-size:18.2px;height:auto;min-height:48px;width:100%;justify-content:center}
.lt .tiles{flex-direction:column}
.lt .tile{font-size:19.5px;min-height:60px}
.lt .sh span{font-size:22.1px}
.lt .hd .t{font-size:22.1px;line-height:28px}
.lt .bp{font-size:23.8px;min-height:64px}
.lt .bt{font-size:19.6px}
.lt .hint{font-size:20.8px;line-height:27px}
"""


def status_bar(dark: bool) -> str:
    return ('<div class="sb"><span>9:41</span><span class="sbi">'
            '<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>'
            '<svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 2.3c2.3 0 4.4.9 6 2.4l1.2-1.2C13.8 1.6 11.3.6 8.5.6S3.2 1.6 1.3 3.5l1.2 1.2c1.6-1.5 3.7-2.4 6-2.4zm0 3.4c1.4 0 2.6.5 3.6 1.4l1.2-1.2C12 4.7 10.3 4 8.5 4S5 4.7 3.7 5.9l1.2 1.2c1-.9 2.2-1.4 3.6-1.4zm0 3.4c.5 0 1 .2 1.3.5L8.5 11 7.2 9.6c.3-.3.8-.5 1.3-.5z"/></svg>'
            '<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor"/><rect x="24.6" y="4.3" width="1.6" height="4.4" rx=".8" fill="currentColor" opacity=".45"/></svg>'
            '</span></div>')


def header(title: str, back: bool = True) -> str:
    b = f'<div class="back">{lu("chev-l", 22)}</div>' if back else ''
    return f'<div class="hd">{b}<div class="t">{title}</div></div>'


def phone(body: str, dark: bool = False, kind: str = 'vp', extra_cls: str = '') -> str:
    scheme = 'dark' if dark else 'light'
    return f'<div class="phone {kind} {scheme} {extra_cls}">{status_bar(dark)}{body}</div>'


def cell(title: str, tags: list, frame: str, note: str = '') -> str:
    tag_html = ''.join(f'<span class="tag {c}">{t}</span>' for t, c in tags)
    n = f'<div class="fnote">{note}</div>' if note else ''
    return f'<div class="cell"><div class="cap"><b>{title}</b>{tag_html}</div>{frame}{n}</div>'


def group(title: str, text: str) -> str:
    return f'<div class="group"><h2>{title}</h2><p>{text}</p></div>'


def footer(*parts: str) -> str:
    return f'<div class="ft">{"".join(parts)}</div>'


def bp(label: str) -> str:
    return f'<div class="bp">{label}</div>'


def bo(label: str) -> str:
    return f'<div class="bo">{label}</div>'


def bt(label: str) -> str:
    return f'<div class="bt">{label}</div>'


STATUS = {
    'ok': ('ok', 'ok', 'Checked'),
    'chk': ('chk', 'alert', 'Check this'),
    'nf': ('nf', 'dashed', 'Not found'),
    'as': ('as', 'info', 'Assumed'),
    'me': ('me', 'user-ok', 'Confirmed by you'),
}


def status(kind: str) -> str:
    cls, ic, word = STATUS[kind]
    return f'<span class="st {cls}">{lu(ic, 14, sw=2.2)}{word}</span>'


def src(text: str) -> str:
    return f'<div class="src">{lu("file", 13)}<span>{text}</span></div>'


def rrow(label: str, value: str, source: str, st: str, note: str = '', acts: str = '') -> str:
    n = f'<div class="nt">{note}</div>' if note else ''
    return (f'<div class="rr"><div class="r1"><span class="rl">{label}</span>{status(st)}</div>'
            f'<div class="r2"><div class="vals">{value}</div><span class="pen">{lu("pencil", 18)}</span></div>'
            f'{src(source)}{n}{acts}</div>')


def change(old: str, new: str) -> str:
    return f'<span class="old">{old}</span><span class="arr">→</span><span class="new">{new}</span>'


def same(value: str, word: str = 'same as now') -> str:
    return f'<span class="new">{value}</span><span class="old">· {word}</span>'


def sh(icon_name: str, text: str, dark: bool, first: bool = False) -> str:
    style = ' style="margin-top:26px"' if first else ''
    return f'<div class="sh"{style}>{icon(icon_name, dark, 26)}<span>{text}</span></div>'


def hero(dark: bool, kicker: str, title: str, lines: str, block: str = '', badge: str = 'loan-file-checked') -> str:
    return (f'<div class="card hero"><div class="hrow">{icon(badge, dark, 44)}<div>'
            f'<div class="hk">{kicker}</div><div class="ht">{title}</div></div></div>'
            f'<div class="hsep"></div>{lines}{block}</div>')


def hl(kind: str, text: str) -> str:
    color = {'ok': 'var(--ok)', 'chk': 'var(--warn)', 'me': 'var(--me)', 'as': 'var(--muted)'}[kind]
    ic = {'ok': 'ok', 'chk': 'alert', 'me': 'user-ok', 'as': 'info'}[kind]
    return f'<div class="hl">{lu(ic, 17, color, 2.2)}<span>{text}</span></div>'


def warn_block(title: str, text: str, ic: str = 'alert') -> str:
    return (f'<div class="wb">{lu(ic, 18, "var(--warn)", 2.2)}<div><div class="w1">{title}</div>'
            f'<div class="w2">{text}</div></div></div>')


def check_card(lines: list) -> str:
    inner = ''
    for kind, a, b in lines:
        color = 'var(--ok)' if kind == 'ok' else 'var(--muted)'
        ic = 'ok' if kind == 'ok' else 'dashed'
        inner += f'<div class="cl">{lu(ic, 17, color, 2.2)}<div><div class="a">{a}</div><div class="b">{b}</div></div></div>'
    return f'<div class="card ck" style="margin-top:30px"><div class="ct">How Skip checked</div>{inner}</div>'


def nothing_saved() -> str:
    return f'<div class="info">{lu("info", 14)}<span>Filling only changes the calculator. Nothing is saved until you tap Save.</span></div>'


# ---------- 1. the card on the calculator ----------

def calc_bottom(dark: bool, free: bool) -> str:
    end = (f'<span class="pro">PRO</span><span style="opacity:.55">{lu("chev-r", 20)}</span>' if free
           else lu('chev-r', 20))
    body = header('Loan calculator') + '<div class="sc" style="justify-content:flex-end;padding-bottom:16px">'
    # Scrolled to the end: the sliders card runs off the top of the screen.
    body += '<div class="card">'
    for label, chip, at in [('Loan amount', '$25,000', 51.5), ('Interest rate', '7.50%', 25.0), ('Term', '5 years', 11.4)]:
        body += (f'<div class="sl"><div class="slt"><span style="font-size:14px;color:var(--muted)">{label}</span>'
                 f'<span class="chipv">{chip}</span></div><div class="track"><div class="fill" style="width:{at}%"></div>'
                 f'<div class="thumb" style="left:{at}%"></div></div></div>')
    body += '</div>'
    body += sh('loan-dates', 'Dates', dark)
    body += ('<div class="card"><div class="row"><span class="l">Money received</span><span class="v">9 Sep 2026'
             f'<span class="muted">{lu("chev-r", 18)}</span></span></div>'
             '<div class="row"><span class="l">First payment</span><span class="v">9 Oct 2026'
             f'<span class="muted">{lu("chev-r", 18)}</span></span></div></div>')
    body += (f'<div class="card lc" style="margin-top:30px">{icon("more-options", dark, 38)}<div class="tx">'
             '<div class="t1">More options</div><div class="t2">Extra payments &amp; fees</div></div>'
             f'<div class="end" style="font-size:13px">Optional {lu("chev-d", 18)}</div></div>')
    body += f'<div class="info">{lu("info", 14)}<span>Interest is worked out monthly on what you still owe.</span></div>'
    body += (f'<div class="card lc" style="margin-top:24px">{icon("payment-schedule", dark, 38)}<div class="tx">'
             '<div class="t1">Payment schedule</div><div class="t2">See where all 60 payments go</div></div>'
             f'<div class="end">{lu("chev-r", 20)}</div></div>')
    body += (f'<div class="card lc" style="margin-top:12px">{icon("loan-file", dark, 38)}<div class="tx">'
             '<div class="t1">Upload your loan file</div><div class="t2">Upload the loan file you received from your bank</div></div>'
             f'<div class="end">{end}</div></div>')
    body += '</div>' + footer(bp('Save'))
    return phone(body, dark)


def explainer() -> str:
    body = header('Skip Pro') + '<div class="sc" style="justify-content:center"><div class="ex">'
    body += f'<div class="excircle">{lu("file", 44, "#fff", 1.7)}</div>'
    body += '<div class="exchip">$27,450.00 · 7.49% · 60 payments</div>'
    body += '<div class="ext">Upload your loan file</div>'
    body += '<div class="exs">Skip reads your bank’s loan file and fills in the calculator, with every number shown for you to check.</div>'
    body += '<div class="exp">'
    for ic, text in [('file', 'Fills in the calculator for you'), ('list', 'Every number shown for you to check'),
                     ('phone', 'Your file never leaves your phone')]:
        body += f'<div>{lu(ic, 22, "var(--accent-ink)", 1.7)}<span>{text}</span></div>'
    body += '</div></div></div>'
    body += footer(f'<div class="bt" style="min-height:0;font-size:12px;gap:6px">{lu("lock", 13)} Included with Skip Pro</div>',
                   bp('Get Skip Pro — $1.99/mo'), bt('Not now'))
    return phone(body)


# ---------- 2. choose the file ----------

def upload_page(dark: bool) -> str:
    body = header('Upload your loan file')
    body += '<div class="sc">'
    body += (f'<div class="card hero"><div class="hrow">{icon("loan-file", dark, 52)}<div>'
             '<div class="hk">From your bank’s loan file</div>'
             '<div class="ht">Skip fills in the calculator</div>'
             '<div class="hl" style="margin-top:6px;color:var(--muted)">You check every number before anything changes.</div>'
             '</div></div></div>')
    body += '<div class="card" style="margin-top:24px"><div style="font-weight:600;font-size:15px;padding:16px 18px 2px">What works best</div>'
    for ic, a, b in [('file', 'Your loan agreement or disclosure', 'The part that shows the amount, rate and payments'),
                     ('bank', 'A PDF from your bank', 'From online banking, an email or Files'),
                     ('lock', 'Locked PDFs are fine', 'Skip asks for the password')]:
        body += f'<div class="tip"><span class="muted">{lu(ic, 20)}</span><div><div class="a">{a}</div><div class="b">{b}</div></div></div>'
    body += '</div>'
    body += (f'<div class="card lc" style="margin-top:12px"><span class="sq">{lu("camera", 20)}</span><div class="tx">'
             '<div class="t1">Photos and scans</div><div class="t2">Paper copies and photos of your loan file</div></div>'
             '<span class="soon">Coming soon</span></div>')
    body += f'<div class="info" style="margin-top:16px">{lu("lock", 14)}<span>Your file is read on this phone and never leaves it. Skip doesn’t keep a copy.</span></div>'
    body += '</div>' + footer(bp('Choose a PDF'))
    return phone(body, dark)


# ---------- 3. password ----------

def password_page(wrong: bool) -> str:
    body = header('Locked file') + '<div class="sc">'
    body += (f'<div style="display:flex;flex-direction:column;align-items:center;text-align:center;margin-top:8px">'
             f'{icon("loan-file-problem", False, 64)}'
             '<div class="mt" style="margin-top:16px">This file is locked</div>'
             '<div class="mb" style="margin-top:6px">Enter its password to open it.</div></div>')
    body += '<div class="fl" style="margin-top:22px">Password</div>'
    if wrong:
        body += f'<div class="field err"><span style="flex:1;letter-spacing:5px;font-size:11px">●●●●●●●●</span><span class="eye">{lu("eye", 20)}</span></div>'
        body += '<div class="hint" style="text-align:left;padding:8px 2px 0">That password didn’t open the file.</div>'
    else:
        body += f'<div class="field"><span class="caret"></span><span class="ph">Enter the file’s password</span><span class="eye">{lu("eye", 20)}</span></div>'
    body += f'<div class="info" style="margin-top:12px">{lu("lock", 14)}<span>Skip uses it once to open the file and doesn’t keep it.</span></div>'
    body += '</div>' + '<div class="ft" style="padding-bottom:10px">' + bp('Open') + '</div>'
    body += '<div class="kb">iOS keyboard</div>'
    return phone(body)


# ---------- 4. reading ----------

def reading_page(dark: bool) -> str:
    body = header('Reading your file') + '<div class="sc"><div class="mid" style="justify-content:center">'
    body += icon('loan-file-reading', dark, 96)
    body += '<div class="mt">Page 2 of 6</div>'
    body += '<div class="bar"><i style="width:33.3%"></i></div>'
    body += '<div class="mb" style="font-size:14px;margin-top:14px">Looking for the amount, rate, payments and dates</div>'
    body += '</div>'
    body += (f'<div class="card lc"><span class="sq" style="color:var(--ink)">{lu("lock", 20)}</span><div class="tx">'
             '<div class="t1">Nothing leaves your phone</div><div class="t2">Skip reads your file here and forgets it when you’re done.</div></div></div>')
    body += '</div>' + footer(bo('Stop'))
    return phone(body, dark)


# ---------- 5. review ----------

def review_r1(dark: bool, kind: str) -> str:
    body = header('Check the numbers')
    body += '<div class="sub">Nothing changes until you fill the calculator.</div><div class="sc">'
    body += hero(dark, 'From your loan file · 4 pages', 'Matches your bank’s figures to the cent',
                 hl('ok', '8 of 8 found and checked against your file’s own totals'))
    body += sh('loan-details', 'The loan', dark)
    body += '<div class="card">'
    body += rrow('Loan amount', change('$25,000.00', '$27,450.00'), 'Page 1 · “Loan Amount”', 'ok')
    body += rrow('Interest rate', change('7.50%', '7.49%'), 'Page 1 · “Interest Rate”', 'ok')
    body += rrow('Term', same('60 payments'), 'Page 2 · payment schedule · 59 + 1 payments', 'ok')
    body += rrow('Monthly payment', change('$500.95', '$549.94'), 'Page 2 · payment schedule · last one $549.66', 'ok')
    body += '</div>'
    body += sh('loan-dates', 'Dates', dark)
    body += '<div class="card">'
    body += rrow('Money received', change('9 Sep 2026', '15 Sep 2026'), 'Page 1 · “Date of Note” · printed 09/15/2026', 'ok')
    body += rrow('First payment', change('9 Oct 2026', '15 Oct 2026'), 'Page 2 · “Monthly beginning 10/15/2026”', 'ok')
    body += '</div>'
    body += sh('more-options', 'More options', dark)
    body += '<div class="card">'
    body += rrow('Fees paid upfront', change('None', '$450.00'), 'Page 3 · itemization · “Prepaid Finance Charge”', 'ok')
    body += rrow('How interest is charged', change('Monthly rests', 'Daily · 365'), 'Page 1 · “Simple Interest”', 'ok')
    body += '</div>'
    body += check_card([('ok', 'APR', 'Your file 8.19% · Skip 8.19%'),
                        ('ok', 'Monthly payment', 'Your file $549.94 · Skip $549.94'),
                        ('ok', 'Last payment', 'Your file $549.66 · Skip $549.66'),
                        ('ok', 'Finance charge', 'Your file $5,996.12 · Skip $5,996.12'),
                        ('ok', 'Total of payments', 'Your file $32,996.12 · Skip $32,996.12')])
    body += nothing_saved()
    body += '</div>' + footer(bp('Fill the calculator'), bt('Not now'))
    return phone(body, dark, kind)


def r2_rate_row(state: str) -> str:
    if state == 'open':
        return rrow('Interest rate', change('7.50%', '9.99%'), 'Page 1 · “Annual percentage rate”', 'chk',
                    'Your file gives the APR only. With no fees it is usually the interest rate.',
                    '<div class="acts"><span class="use">Use this</span></div>')
    return rrow('Interest rate', change('7.50%', '9.99%'), 'Page 1 · “Annual percentage rate”', 'me')


def r2_first_row(state: str) -> str:
    if state == 'open':
        tiles = ('<div class="tiles"><div class="tile">11 May 2026<span class="radio"></span></div>'
                 '<div class="tile">5 Nov 2026<span class="radio"></span></div></div>')
        return rrow('First payment', change('9 Oct 2026', '?'), 'Page 2 · “First payment due 05/11/2026”', 'chk',
                    'This date can be read two ways. Which is it?', tiles)
    tiles = ('<div class="tiles"><div class="tile">11 May 2026<span class="radio"></span></div>'
             f'<div class="tile sel">5 Nov 2026<span class="radio">{lu("check", 14, "#fff", 3)}</span></div></div>')
    return rrow('First payment', change('9 Oct 2026', '5 Nov 2026'), 'Page 2 · “First payment due 05/11/2026”', 'me',
                '', tiles)


def review_r2(kind: str, state: str = 'open', hint: bool = True, scrolled: bool = False) -> str:
    body = header('Check the numbers')
    if not scrolled:
        body += '<div class="sub">Nothing changes until you fill the calculator.</div>'
    body += '<div class="sc">'
    if state == 'open':
        lines = hl('ok', '3 checked') + hl('chk', '2 need a look')
    else:
        lines = hl('ok', '3 checked') + hl('me', '2 confirmed by you')
    if not scrolled:
        body += hero(False, 'From your loan file · 2 pages', 'Found 5 of 8', lines,
                     badge='loan-file-problem' if state == 'open' else 'loan-file-checked')
        body += sh('loan-details', 'The loan', False)
    body += '<div class="card">'
    if not scrolled:
        body += rrow('Loan amount', change('$25,000.00', '$12,000.00'), 'Page 1 · “Amount of loan”', 'ok')
    body += r2_rate_row(state)
    body += rrow('Term', change('60 payments', '36 payments'), 'Page 1 · “36 monthly payments of $387.15”', 'ok')
    body += rrow('Monthly payment', change('$500.95', '$387.15'), 'Page 1 · “36 monthly payments of $387.15”', 'ok')
    body += '</div>'
    body += sh('loan-dates', 'Dates', False)
    body += '<div class="card">'
    if state == 'open':
        body += rrow('Money received', '<span class="old">9 Sep 2026</span><span class="arr">→</span>'
                     '<span class="soft">a month before the first payment</span>',
                     'Not in your file. Skip uses a month before the first payment, as the calculator does.', 'as')
    else:
        body += rrow('Money received', change('9 Sep 2026', '5 Oct 2026'),
                     'Not in your file. Skip uses a month before the first payment, as the calculator does.', 'as')
    body += r2_first_row(state)
    body += '</div>'
    if kind == 'tall':
        body += sh('more-options', 'More options', False)
        body += '<div class="card">'
        body += rrow('Fees paid upfront', same('None', 'unchanged'), 'Not in your file. The calculator keeps what it has.', 'nf')
        body += rrow('How interest is charged', same('Monthly rests'),
                     'Not stated in your file. Monthly rests gives your bank’s payment, $387.15.', 'as')
        body += '</div>'
        body += check_card([('ok', 'APR', 'Your file 9.99% · Skip 9.99%'),
                            ('ok', 'Monthly payment', 'Your file $387.15 · Skip $387.15'),
                            ('nf', 'Total of payments', 'Not in your file')])
        body += nothing_saved()
    body += '</div>'
    parts = []
    if hint:
        parts.append('<div class="hint">To fill the calculator, check: Interest rate, First payment.</div>')
    parts += [bp('Fill the calculator'), bt('Not now')]
    body += footer(*parts)
    return phone(body, False, kind)


def review_r3() -> str:
    body = header('Check the numbers')
    body += '<div class="sub">Nothing changes until you fill the calculator.</div><div class="sc">'
    body += hero(False, 'From your loan file · 3 pages', 'Found 8 of 8', hl('ok', '8 checked'),
                 warn_block('Skip’s schedule will be an estimate',
                            'Your rate can change. Skip uses today’s rate, 8.25%, so later payments and balances may differ from your bank’s.'),
                 badge='loan-file-problem')
    body += sh('loan-details', 'The loan', False)
    body += '<div class="card">'
    body += rrow('Loan amount', change('$25,000.00', '$40,000.00'), 'Page 1 · “Loan Amount”', 'ok')
    body += rrow('Interest rate', change('7.50%', '8.25%'), 'Page 1 · “Current Interest Rate”', 'ok',
                 'Today’s rate. It can change.')
    body += rrow('Term', change('60 payments', '120 payments'), 'Page 2 · payment schedule · 119 + 1 payments', 'ok')
    body += '</div></div>' + footer(bp('Fill the calculator'), bt('Not now'))
    return phone(body)


def review_r4() -> str:
    body = header('Check the numbers')
    body += '<div class="sub">Nothing changes until you fill the calculator.</div><div class="sc">'
    body += hero(False, 'From your loan file · 1 page', 'Found 2 of 8', hl('chk', '2 need a look'),
                 warn_block('This looks like a monthly statement',
                            'A statement fills the rate and payment only. For the rest, upload your loan agreement.', 'info'),
                 badge='loan-file-problem')
    body += sh('loan-details', 'The loan', False)
    body += '<div class="card">'
    body += rrow('Loan amount', same('$25,000.00', 'unchanged'), 'A statement shows what’s left to pay, not what you borrowed.', 'nf')
    body += rrow('Interest rate', change('7.50%', '7.49%'), 'Page 1 · “Interest Rate”', 'chk',
                 '', '<div class="acts"><span class="use">Use this</span></div>')
    body += rrow('Monthly payment', change('$500.95', '$549.94'), 'Page 1 · “Regular Payment”', 'chk',
                 '', '<div class="acts"><span class="use">Use this</span></div>')
    body += '</div></div>' + footer(bp('Fill the calculator'), bt('Not now'))
    return phone(body)


def review_dark() -> str:
    return review_r1(True, 'vp')


def review_large() -> str:
    body = header('Check the numbers') + '<div class="sc">'
    body += sh('loan-details', 'The loan', False, first=True).replace('margin-top:26px', 'margin-top:4px')
    body += '<div class="card">'
    body += ('<div class="rr"><div class="rl">Interest rate</div><div style="margin-top:6px">' + status('chk') + '</div>'
             '<div class="r2" style="display:block;margin-top:8px"><div><span class="old">7.50%</span></div>'
             '<div style="display:flex;align-items:center;gap:8px"><span class="arr">→</span><span class="new">9.99%</span>'
             f'<span class="pen" style="margin:0 -12px 0 auto">{lu("pencil", 22)}</span></div></div>'
             f'{src("Page 1 · “Annual percentage rate”")}'
             '<div class="nt">Your file gives the APR only. With no fees it is usually the interest rate.</div>'
             '<div class="acts"><span class="use">Use this</span></div></div>')
    body += '</div>'
    body += sh('loan-dates', 'Dates', False)
    body += '<div class="card">'
    body += ('<div class="rr"><div class="rl">First payment</div><div style="margin-top:6px">' + status('chk') + '</div>'
             '<div class="r2" style="display:block;margin-top:8px"><div><span class="old">9 Oct 2026</span></div>'
             '<div style="display:flex;align-items:center;gap:8px"><span class="arr">→</span><span class="new">?</span>'
             f'<span class="pen" style="margin:0 -12px 0 auto">{lu("pencil", 22)}</span></div></div>'
             f'{src("Page 2 · “First payment due 05/11/2026”")}'
             '<div class="nt">This date can be read two ways. Which is it?</div>'
             '<div class="tiles"><div class="tile">11 May 2026<span class="radio"></span></div>'
             '<div class="tile">5 Nov 2026<span class="radio"></span></div></div></div>')
    body += '</div></div>'
    body += footer('<div class="hint">To fill the calculator, check: Interest rate, First payment.</div>',
                   bp('Fill the calculator'), bt('Not now'))
    return phone(body, False, 'tall', 'lt')


def leave_dialog() -> str:
    inner = review_r2('vp', 'resolved', hint=False)
    dlg = ('<div class="scrim"><div class="dlg"><div class="dt">Leave without filling the calculator?</div>'
           '<div class="dm">Nothing you have entered here will be saved.</div>'
           '<div class="db"><div style="border:1px solid var(--accent);color:var(--ink)">Go back</div>'
           '<div style="background:var(--danger);color:var(--surface)">Yes</div></div></div></div>')
    return inner[:-len('</div>')] + dlg + '</div>'


# ---------- 6. one field ----------

def edit_rate() -> str:
    body = header('Interest rate') + '<div class="sc" style="padding-top:0">'
    body += '<div style="text-align:center;font-size:20px;color:var(--muted);margin-top:24px;line-height:26px">What rate does your loan charge?</div>'
    body += ('<div style="display:flex;justify-content:center;align-items:flex-start;margin-top:24px;font-weight:700">'
             '<span style="font-size:64px;line-height:76px">9.99</span>'
             '<span style="font-size:28px;line-height:34px;margin-top:9.5px">%</span></div>')
    body += '<div style="text-align:center;font-size:12px;color:var(--muted);margin-top:6px">Your file: “Annual percentage rate 9.99%” · page 1</div>'
    keys = ''.join(f'<div class="key">{k}</div>' for k in ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'])
    keys += f'<div class="key">{lu("backspace", 26, sw=1.8)}</div>'
    body += f'<div style="margin-top:auto;padding-top:32px"><div class="keys">{keys}</div></div>'
    body += '</div>' + footer(bp('Done'))
    return phone(body)


# ---------- 7. failures ----------

def failure(title: str, text: str, tips: list = None, primary: str = 'Try another file', dark: bool = False) -> str:
    body = header('Upload your loan file') + '<div class="sc"><div class="mid" style="padding-top:56px">'
    body += icon('loan-file-problem', dark, 88)
    body += f'<div class="mt">{title}</div>'
    if text:
        body += f'<div class="mb">{text}</div>'
    body += '</div>'
    if tips:
        body += '<div class="card" style="margin-top:20px">'
        for ic, a, b in tips:
            body += f'<div class="tip"><span class="muted">{lu(ic, 20)}</span><div><div class="a">{a}</div><div class="b">{b}</div></div></div>'
        body += '</div>'
    body += '</div>' + footer(bp(primary), bt('Enter it yourself'))
    return phone(body, dark)


# ---------- 8. after filling ----------

def calc_after() -> str:
    body = header('Loan calculator') + '<div class="sc">'
    body += (f'<div class="card res"><div style="display:flex;gap:14px;align-items:center">{icon("loan-result", False, 52)}'
             '<div><div style="font-size:13px;color:var(--muted)">Monthly payment</div>'
             '<div style="font-size:32px;font-weight:700;line-height:40px;margin-top:2px">$549.94</div></div></div>'
             '<div style="font-size:13px;color:var(--muted);margin-top:12px">60 payments · last on 15 Sep 2031</div>'
             '<div style="display:flex;gap:4px;height:8px;margin-top:16px"><div style="flex:27450;background:var(--accent);border-radius:99px"></div>'
             '<div style="flex:5546.12;background:rgba(144,84,121,.45);border-radius:99px"></div></div>'
             '<div class="sum" style="margin-top:16px"><span class="k"><i class="dot" style="background:var(--accent)"></i>Borrowed</span><b>$27,450.00</b></div>'
             '<div class="sum"><span class="k"><i class="dot" style="background:rgba(144,84,121,.45)"></i>Interest</span><b>$5,546.12</b></div>'
             '<div class="sum"><span class="k">Fees at closing</span><b>$450.00</b></div>'
             '<div style="height:1px;background:var(--line);margin-top:12px"></div>'
             '<div class="sum" style="font-size:15px"><b>Total you repay</b><b style="font-size:17px">$32,996.12</b></div>'
             '<div class="sum"><span class="k">APR</span><b>8.19%</b></div>'
             '<div style="font-size:12px;line-height:17px;color:var(--muted);margin-top:16px">The APR is what the credit costs once the fees and the length of the first period are counted in — the figure a US lender has to disclose. It is higher than the rate whenever you pay for the loan before you start repaying it.</div></div>')
    body += sh('loan-details', 'The loan', False)
    body += ('<div class="card"><div class="sl"><div class="slt"><span style="font-size:14px;color:var(--muted)">Loan amount</span>'
             '<span class="chipv">$27,450</span></div><div class="track"><div class="fill" style="width:52.7%"></div>'
             '<div class="thumb" style="left:52.7%"></div></div></div></div>')
    body += '</div>' + footer(bp('Save'))
    body += f'<div class="toastw"><div class="toast"><span class="i">{lu("check", 14, "#fff", 3)}</span>Filled in from your file</div></div>'
    return phone(body)


def build() -> str:
    out = ['<!doctype html><html lang="en"><head><meta charset="utf-8">',
           '<meta name="viewport" content="width=device-width,initial-scale=1">',
           '<title>Loan file upload: screens for approval</title>',
           f'<style>{font_faces()}{CSS}</style></head><body>']
    out.append('<div class="intro"><h1>Loan file upload (C1): screens for approval</h1>'
               '<p>Draft by Paulo, 9 Oct 2026, from Dmitri’s approved plan. Spec: <code>.claude/team/design/loan-upload.md</code>. '
               'Frames are drawn at 390pt (the size of the Founder’s loan designs) and shown 300px wide. Type is the app’s Montserrat, embedded. '
               'Tall frames show the whole scroll; on the phone the footer stays pinned.</p>'
               '<p>Every loan figure comes from Skip’s own engine (<code>src/lib/loan.ts</code>, <code>apr.ts</code>), run on the example loans in the spec. '
               'The calculator’s “before” values are the Founder’s design: $25,000 at 7.50% for 60 months, $500.95 a month (monthly rests).</p>'
               '<p>The upload icon (orange page, blue box, navy arrow) is my stand-in drawn in the Founder’s palette. It needs his own drawing, light and dark.</p>'
               '<div class="legend light" style="background:#fff">'
               f'<div>{status("ok")} passed an arithmetic check</div>'
               f'<div>{status("chk")} read, but needs you before it is used</div>'
               f'<div>{status("me")} you used it or changed it</div>'
               f'<div>{status("as")} Skip’s default, shown</div>'
               f'<div>{status("nf")} not in the file; the calculator keeps its value</div>'
               '</div></div>')
    out.append('<div class="board">')

    out.append(group('1 · The card on the calculator',
                     'Last in the scroll, straight above Save, under “Payment schedule”. Same card as Payment schedule: 38pt gradient icon, 15pt title, 12pt hint, chevron. Free accounts see the PRO pill and go to the explainer.'))
    out.append(cell('Calculator, bottom · Pro', [('New card', '')], calc_bottom(False, False),
                    'Whole card is one button (min 70pt tall). Opens “Upload your loan file”.'))
    out.append(cell('Calculator, bottom · Free', [('New card', '')], calc_bottom(False, True),
                    'PRO pill as on Home’s Spending habits tile. Opens the explainer.'))
    out.append(cell('Calculator, bottom · Pro', [('Dark', 'd')], calc_bottom(True, False)))
    out.append(cell('Explainer (free)', [('New copy', '')], explainer(),
                    'The existing Skip Pro explainer with a new entry. The price on the button is the App Store’s; $1.99/mo is the app’s own fallback text.'))

    out.append(group('2 · Choose the file',
                     'One page before the system’s Files picker. In C1 only PDFs can be read, so photos and scans show as “Coming soon”, not as a button that fails.'))
    out.append(cell('Upload your loan file', [('New screen', '')], upload_page(False),
                    'Choose a PDF opens the iOS Files picker. Cancel there comes back here with no message.'))
    out.append(cell('Upload your loan file', [('Dark', 'd')], upload_page(True)))

    out.append(group('3 · Locked PDFs', 'Only when the PDF has an open password. The password lives in this page only and is passed to the reader once.'))
    out.append(cell('Locked file', [('New screen', '')], password_page(False),
                    'Field focused on arrival. Return key “Go” = Open. Eye shows or hides the password.'))
    out.append(cell('Locked file · wrong password', [('State', 's')], password_page(True),
                    'A form hint in its own words, not the failure line. The third wrong try goes to section 7.'))

    out.append(group('4 · Reading', 'Shown while the phone reads the file. A 10-page text PDF should take under a second, so most people see this only briefly; no fake delay is added.'))
    out.append(cell('Reading your file', [('New screen', '')], reading_page(False),
                    'Stop (or Back) cancels between pages and returns to “Upload your loan file”. When reading ends, “Check the numbers” replaces this page.'))
    out.append(cell('Reading your file', [('Dark', 'd')], reading_page(True)))

    out.append(group('5 · Check the numbers',
                     'Every number the file gives, beside what the calculator has now, where it was found, and a mark that is always an icon and a word. Rows follow the calculator: The loan, Dates, More options. The pencil opens one field on its own page.'))
    out.append(cell('All checked', [('New screen', ''), ('Full length', 's')], review_r1(False, 'tall'),
                    'Example A: a personal loan agreement, simple interest, $450 origination fee. Every figure here, the APR and the totals are Skip’s own engine output and agree with the file to the cent.'))
    out.append(cell('Partial', [('State', 's'), ('Full length', 's')], review_r2('tall'),
                    'Example B: a credit-union offer letter. APR only (no note rate), a date that reads both ways, no money-received date, no fees. Shown after a tap on Fill: the line lists what still needs a look.'))
    out.append(cell('Partial, resolved', [('State', 's')], review_r2('vp', 'resolved', hint=False, scrolled=True),
                    'Scrolled to the rows that changed, after “Use this” on the rate and a tap on 5 Nov 2026. Money received follows the chosen date. The hero now reads “3 checked · 2 confirmed by you” and Fill works.'))
    out.append(cell('Estimate warning', [('State', 's')], review_r3(),
                    'Example C: a variable-rate loan. Every check passes, but a loan Skip can’t price exactly never says “to the cent”.'))
    out.append(cell('Monthly statement', [('State', 's')], review_r4(),
                    'CEO default: a statement fills the rate and payment only. Both need “Use this”: a statement has no totals to check against.'))
    out.append(cell('All checked', [('Dark', 'd')], review_dark()))
    out.append(cell('Large text', [('AX sizes', 'w')], review_large(),
                    'At the TEXT_CAP ceilings: the mark drops under the label, the new value under the old, Use this goes full width, the two dates stack.'))
    out.append(cell('Leaving after checking', [('Dialog', 's')], leave_dialog(),
                    'Only when something was confirmed or changed. The house discard dialog; leaving untouched needs no question.'))

    out.append(group('6 · Change one number', 'One field per page, with the app’s own controls. Done marks the row “Confirmed by you”. Back writes nothing.'))
    out.append(cell('Interest rate', [('New screen', '')], edit_rate(),
                    'The keypad page every amount uses, in percent. The file’s own words sit under the figure so the person can compare.'))

    out.append(group('7 · When it can’t be read',
                     'One layout for all: the problem icon, a heading that says what happened in plain words, what to do, and two ways on. Only a real failure uses the one failure line.'))
    out.append(cell('Unreadable', [('State', 's')], failure(
        'We couldn’t read any text in this file', 'It may be blank, handwritten or too dark to read.',
        [('file', 'Use the PDF your bank sent', 'Or the one in your online banking'),
         ('bank', 'Ask your bank for a copy', 'Most can email the loan agreement')])))
    out.append(cell('No loan found', [('State', 's')], failure(
        'We couldn’t find loan numbers', 'Is this your loan agreement or disclosure? That’s the part with the amount, the rate and the payments.')))
    out.append(cell('Too big', [('State', 's')], failure(
        'This file is too big', 'Skip reads files up to 50 MB. If your bank sent a long package, try the loan agreement on its own.')))
    out.append(cell('Password didn’t work', [('State', 's')], failure(
        'The password didn’t work', 'The file is still locked after 3 tries. Check the password with your bank, or ask them for a copy without one.')))
    out.append(cell('A scan (C1 only)', [('State', 's')], failure(
        'This file is a scan', 'Reading scans is coming soon. A PDF from your bank’s website or email will work now.')))
    out.append(cell('Credit card statement', [('State', 's')], failure(
        'This looks like a credit card statement', 'The calculator needs a loan with fixed payments, like a car, personal or student loan.')))
    out.append(cell('Not a PDF', [('State', 's')], failure(
        'This file isn’t a PDF', 'Skip reads PDFs for now. Photos and scans are coming soon.')))
    out.append(cell('Something went wrong', [('State', 's')], failure(
        'Something went wrong. Please try again.', '', primary='Try again'),
        'The one failure line, word for word. Try again reopens the Files picker (the copy was already deleted).'))
    out.append(cell('No loan found', [('Dark', 'd')], failure(
        'We couldn’t find loan numbers', 'Is this your loan agreement or disclosure? That’s the part with the amount, the rate and the payments.', dark=True)))

    out.append(group('8 · Back on the calculator',
                     'Fill the calculator closes the flow, lands on the calculator scrolled to the top, and confirms with the toast. Nothing is saved: Save is still the person’s step.'))
    out.append(cell('Calculator after filling', [('Toast', 's')], calc_after(),
                    'Example A applied: $549.94 a month, last payment 15 Sep 2031, interest $5,546.12, fees $450.00, total $32,996.12, APR 8.19%. The amount slider sits at 52.7% on the calculator’s log scale.'))

    out.append('</div></body></html>')
    return '\n'.join(out)


if __name__ == '__main__':
    OUT.write_text(build())
    print('wrote', OUT, OUT.stat().st_size, 'bytes')
