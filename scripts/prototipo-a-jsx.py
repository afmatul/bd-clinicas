#!/usr/bin/env python3
"""
Convierte las vistas de design-system/prototipo.html en componentes React (JSX) con el mismo
markup y las mismas clases rc-*, para que las pantallas de la web sean fieles a los mockups.

Solo se usó para generar el primer borrador de apps/web/src/pages/*: después las páginas se
editan a mano (datos reales, estado). No lo vuelva a correr sobre páginas ya conectadas a la API.

Uso:
  python3 scripts/prototipo-a-jsx.py <prototipo.html> <lucide-static/icons[:otra/icons]> <carpeta-salida>

- class→className, for→htmlFor, style="…"→style={{…}}, atributos SVG en camelCase.
- value/checked→defaultValue/defaultChecked (formularios no controlados en el borrador).
- href="#vista"→<Link to="/vista">.
- Las SVG del prototipo son Lucide: se reemplazan por el componente de lucide-react
  equivalente (mismo trazo 1.75). Si una SVG no coincide, se deja en línea.
"""
import os
import re
import sys
from html.parser import HTMLParser

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
SVG_TAGS = {'svg', 'path', 'circle', 'line', 'rect', 'polyline', 'polygon', 'ellipse', 'g'}

ATTR_MAP = {
    'class': 'className', 'for': 'htmlFor', 'tabindex': 'tabIndex', 'readonly': 'readOnly',
    'maxlength': 'maxLength', 'minlength': 'minLength', 'colspan': 'colSpan', 'rowspan': 'rowSpan',
    'autocomplete': 'autoComplete', 'inputmode': 'inputMode', 'autofocus': 'autoFocus',
    'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin',
    'fill-rule': 'fillRule', 'clip-rule': 'clipRule', 'stroke-dasharray': 'strokeDasharray',
    'stroke-dashoffset': 'strokeDashoffset', 'viewbox': 'viewBox', 'enterkeyhint': 'enterKeyHint',
    'novalidate': 'noValidate', 'datetime': 'dateTime',
}
BOOL_ATTRS = {'hidden', 'disabled', 'checked', 'readonly', 'required', 'selected', 'multiple', 'autofocus', 'novalidate'}


class Node:
    def __init__(self, tag, attrs, parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, attrs, parent, []


class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node('#root', [])
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        self.cur.children.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, attrs, self.cur))

    def handle_endtag(self, tag):
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is not self.root:
            self.cur = n.parent

    def handle_data(self, data):
        self.cur.children.append(data)


# ---------- Lucide ----------
def norm_svg_children(node):
    parts = []
    for c in node.children:
        if isinstance(c, Node) and c.tag in SVG_TAGS:
            attrs = sorted((k, re.sub(r'\s+', ' ', v or '').strip()) for k, v in c.attrs)
            parts.append(c.tag + str(attrs))
    return '|'.join(parts)


def load_lucide(icons_dir):
    m = {}
    for f in os.listdir(icons_dir):
        if not f.endswith('.svg'):
            continue
        p = Parser()
        p.feed(open(os.path.join(icons_dir, f)).read())
        svg = next(c for c in p.root.children if isinstance(c, Node) and c.tag == 'svg')
        key = norm_svg_children(svg)
        name = ''.join(w.capitalize() for w in f[:-4].split('-'))
        # El nombre más corto gana (lucide tiene alias).
        if key not in m or len(name) < len(m[key]):
            m[key] = name
    return m


# ---------- Emisión JSX ----------
def style_obj(s):
    out = []
    for decl in s.split(';'):
        if ':' not in decl:
            continue
        k, v = decl.split(':', 1)
        k, v = k.strip(), v.strip()
        if k.startswith('--'):
            out.append(f"'{k}': '{v}'")
            continue
        k = re.sub(r'-([a-z])', lambda mm: mm.group(1).upper(), k)
        out.append(f"{k}: {repr(v) if not re.fullmatch(r'-?\d+(\.\d+)?', v) else v}")
    return '{{ ' + ', '.join(out) + ' }}'


def js_str(v):
    return '"' + v.replace('\\', '\\\\').replace('"', '&quot;') + '"' if '"' in v else '"' + v + '"'


def text_jsx(t):
    if not t:
        return ''
    if re.search(r'[{}<>]', t):
        return '{' + repr(t) + '}'
    return t


class Emitter:
    def __init__(self, lucide, views):
        self.lucide, self.views = lucide, views
        self.used_icons, self.uses_link = set(), False

    def attrs(self, n):
        out, tag = [], n.tag
        select_default = None
        for k, v in n.attrs:
            kl = k.lower()
            if kl in ('onsubmit', 'onclick', 'xmlns'):
                continue
            if kl == 'style':
                out.append(f'style={style_obj(v or "")}')
                continue
            if kl == 'value' and tag in ('input', 'textarea'):
                out.append(f'defaultValue={js_str(v or "")}')
                continue
            if kl == 'checked':
                out.append('defaultChecked')
                continue
            if kl == 'selected':
                continue
            name = ATTR_MAP.get(kl, k if kl.startswith(('aria-', 'data-')) or tag in SVG_TAGS else kl)
            if v is not None and re.fullmatch(r'\d+(\.\d+)?', v) and (kl.startswith('aria-value') or kl in ('rows', 'cols', 'maxlength', 'minlength', 'tabindex', 'colspan', 'rowspan')):
                out.append(f'{name}={{{v}}}')
                continue
            if v is None:
                out.append(name if kl in BOOL_ATTRS else f'{name}=""')
            else:
                out.append(f'{name}={js_str(v)}')
        if tag == 'select':
            for c in n.children:
                if isinstance(c, Node) and c.tag == 'option' and any(k == 'selected' for k, _ in c.attrs):
                    select_default = ''.join(x for x in c.children if isinstance(x, str)).strip()
            if select_default:
                out.append(f'defaultValue={js_str(select_default)}')
        return out

    def node(self, n, ind):
        pad = '  ' * ind
        if isinstance(n, str):
            t = re.sub(r'\s+', ' ', n)
            return pad + text_jsx(t.strip()) if t.strip() else ''
        if n.tag == 'svg':
            name = self.lucide.get(norm_svg_children(n))
            if name:
                self.used_icons.add(name)
                extra = [a for a in self.attrs(n) if a.startswith(('className', 'style', 'aria-label'))]
                hidden = 'aria-hidden="true"' if not any(a.startswith('aria-label') for a in extra) else ''
                return pad + f'<{name} strokeWidth={{1.75}} {" ".join(extra)} {hidden}'.rstrip() + ' />'
        tag, attrs = n.tag, self.attrs(n)
        if tag == 'textarea':
            texto = ''.join(c for c in n.children if isinstance(c, str)).strip()
            n.children = []
            if texto:
                attrs.append(f'defaultValue={js_str(texto)}')
        href = dict(n.attrs).get('href')
        if tag == 'a' and href and href.startswith('#') and href[1:] in self.views:
            self.uses_link = True
            tag = 'Link'
            attrs = [('to=' + js_str('/' + href[1:] if href[1:] != 'inicio' else '/')) if a.startswith('href=') else a for a in attrs]
        open_ = f'<{tag}{" " if attrs else ""}{" ".join(attrs)}'
        kids = [self.node(c, ind + 1) for c in n.children]
        kids = [k for k in kids if k.strip()]
        if tag in VOID or not kids:
            return pad + open_ + ' />'
        inline = all(not isinstance(c, Node) or c.tag in ('b', 'span', 'small', 'strong', 'em', 'i') and not any(isinstance(x, Node) for x in c.children) for c in n.children)
        if inline and sum(len(k.strip()) for k in kids) < 90:
            body = ''
            for c in n.children:
                if isinstance(c, str):
                    body += text_jsx(re.sub(r'\s+', ' ', c))
                else:
                    body += self.node(c, 0).strip()
            return pad + open_ + '>' + body.strip() + f'</{tag}>'
        return pad + open_ + '>\n' + '\n'.join(kids) + '\n' + pad + f'</{tag}>'


def pascal(view):
    return ''.join(w.capitalize() for w in view.split('-'))


def main():
    proto, icons_dir, out_dir = sys.argv[1:4]
    p = Parser()
    p.feed(open(proto, encoding='utf8').read())
    # Se aceptan varias carpetas de iconos separadas por ':' (versiones distintas de lucide-static).
    lucide = {}
    for d in icons_dir.split(':'):
        for k, v in load_lucide(d).items():
            lucide.setdefault(k, v)

    found = {}

    def walk(n):
        for c in n.children:
            if isinstance(c, Node):
                dv = dict(c.attrs).get('data-view')
                if dv:
                    found[dv] = c
                walk(c)
    walk(p.root)
    views = set(found) - {'shell', 'login'}
    os.makedirs(out_dir, exist_ok=True)
    for view, n in found.items():
        e = Emitter(lucide, views)
        if view == 'shell':
            # Solo el sidebar y la topbar; las vistas van en sus propios archivos.
            for c in n.children:
                if isinstance(c, Node) and c.tag == 'div' and dict(c.attrs).get('class') == 'main':
                    c.children = [x for x in c.children if not (isinstance(x, Node) and x.tag == 'main')]
        n.attrs = [(k, v) for k, v in n.attrs if k not in ('data-view', 'hidden')]
        body = e.node(n, 2)
        imports = []
        if e.used_icons:
            imports.append('import { ' + ', '.join(sorted(e.used_icons)) + " } from 'lucide-react';")
        if e.uses_link:
            imports.append("import { Link } from 'react-router-dom';")
        name = pascal(view)
        src = (
            f'// Borrador generado desde prototipo.html (vista "{view}") por scripts/prototipo-a-jsx.py.\n'
            + '\n'.join(imports) + '\n\n'
            + f'export default function {name}() {{\n  return (\n{body}\n  );\n}}\n'
        )
        open(os.path.join(out_dir, f'{name}.tsx'), 'w', encoding='utf8').write(src)
        print(f'{name}.tsx: {len(e.used_icons)} iconos Lucide')


if __name__ == '__main__':
    main()
