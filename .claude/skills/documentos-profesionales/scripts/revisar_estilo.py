"""Revisa señales mecánicas de "texto de IA" en un entregable.

Uso:
    python revisar_estilo.py <archivo.docx|.md|.txt|.js|.py>

- .docx: lee los párrafos de word/document.xml (detecta títulos por estilo Heading).
- .md/.txt: texto plano (títulos = líneas que empiezan con #).
- .js/.py: extrae los literales de texto del script generador (títulos = argumento
  de heading1/heading2/heading3/add_heading).

Solo usa la librería estándar. Las señales de contenido (promesas sin dato,
contradicciones entre secciones, meta-narración sutil) requieren lectura humana.
"""
import re
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

MAX_EJEMPLOS = 6

ADVERBIOS = [
    "precisamente", "justamente", "directamente", "sustancialmente",
    "considerablemente", "deliberadamente", "significativamente",
    "en la práctica", "de fondo", "de punta a punta",
    "de forma directa", "de forma independiente", "de forma consistente",
    "de forma sistemática", "de forma explícita", "de forma automática",
]
PROMESAS = [
    "garantiza", "garantizando", "sin necesidad de", "en segundos",
    "miles de series", "efectos positivos", "reducciones medibles",
    "mejora significativa", "lo más limpios",
]
META = [
    "este documento", "esta sección", "como ya se indicó", "a lo largo de este",
    "como se mencionó", "vale la pena", "no son un detalle menor",
    "es importante destacar", "cabe destacar", "cabe mencionar",
]
VERSION = [
    "nueva versión", "versión anterior", "diseño anterior", "se incorporó",
    "la versión original", "ahora el pipeline", "ahora se ",
]
EMOJI_RE = re.compile("[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B50\u2705\u274C\u26A0]")
REF_RE = re.compile(r"\b(?:secci[oó]n(?:es)?|ver|caso|casos)\s+(\d+(?:\.\d+)+|\d+)\b", re.I)
HEAD_NUM_RE = re.compile(r"^\s*(\d+(?:\.\d+)*)\.?\s")
MINUSCULAS_OK = {"de", "del", "la", "las", "el", "los", "y", "o", "en", "por", "para",
                 "con", "sin", "a", "al", "un", "una", "que", "vs", "e", "u", "se", "su"}


# ── Extracción ──────────────────────────────────────────────────────────────

def extraer_docx(path):
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml").decode("utf8")
    items = []
    for i, m in enumerate(re.finditer(r"<w:p[ >].*?</w:p>", xml, re.S), 1):
        bloque = m.group(0)
        texto = "".join(re.findall(r"<w:t(?: [^>]*)?>([^<]*)</w:t>", bloque))
        texto = (texto.replace("&amp;", "&").replace("&lt;", "<")
                 .replace("&gt;", ">").replace("&quot;", '"'))
        if not texto.strip():
            continue
        es_titulo = bool(re.search(r'<w:pStyle w:val="(Heading\d|Ttulo\d|Title)"', bloque))
        items.append((f"párrafo {i}", texto, es_titulo))
    return items


def extraer_texto(path):
    items = []
    for n, linea in enumerate(Path(path).read_text(encoding="utf8").splitlines(), 1):
        if linea.strip():
            es_titulo = linea.lstrip().startswith("#")
            items.append((f"línea {n}", linea.lstrip("# ").rstrip(), es_titulo))
    return items


STR_RE = re.compile(r'"((?:[^"\\\n]|\\.)*)"|\'((?:[^\'\\\n]|\\.)*)\'|`((?:[^`\\]|\\.)*)`', re.S)
HEAD_CALL_RE = re.compile(r"(?:heading[123]|add_heading)\(\s*$")


def extraer_codigo(path):
    src = Path(path).read_text(encoding="utf8")
    inicio_linea = [0] + [m.end() for m in re.finditer("\n", src)]

    def linea_de(pos):
        lo, hi = 0, len(inicio_linea) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if inicio_linea[mid] <= pos:
                lo = mid
            else:
                hi = mid - 1
        return lo + 1

    items = []
    for m in STR_RE.finditer(src):
        s = next(g for g in m.groups() if g is not None)
        # Solo textos de prosa: con espacios y alguna letra; descarta rutas, ids, colores.
        if len(s) < 4 or " " not in s or not re.search(r"[A-Za-záéíóúñÁÉÍÓÚÑ]{3}", s):
            continue
        # Descartar comentarios de código: el literal debe estar fuera de // y #.
        ini = inicio_linea[linea_de(m.start()) - 1]
        prefijo = src[ini:m.start()]
        if "//" in prefijo or prefijo.lstrip().startswith("#"):
            continue
        s = s.replace('\\"', '"').replace("\\'", "'")
        es_titulo = bool(HEAD_CALL_RE.search(src[max(0, m.start() - 20):m.start()]))
        items.append((f"línea {linea_de(m.start())}", s, es_titulo))
    return items


# ── Chequeos ────────────────────────────────────────────────────────────────

def es_title_case(titulo):
    t = HEAD_NUM_RE.sub("", titulo).strip()
    t = re.sub(r"^¿", "", t)
    palabras = re.findall(r"[A-Za-zÁÉÍÓÚÑáéíóúñ][\wÁÉÍÓÚÑáéíóúñ'-]*", t)[1:]
    mayus = [w for w in palabras
             if w[0].isupper() and not w.isupper() and w.lower() not in MINUSCULAS_OK
             and not re.search(r"[A-Z].*[A-Z]|_|\d", w)]
    return len(mayus) >= 2


def revisar(items):
    hall = defaultdict(list)
    conteo = Counter()

    def add(clave, loc, frag):
        hall[clave].append((loc, frag))

    titulos_num = set()
    for loc, texto, es_titulo in items:
        if es_titulo:
            m = HEAD_NUM_RE.match(texto)
            if m:
                titulos_num.add(m.group(1))
            if es_title_case(texto):
                add("Título en Title Case (usar mayúscula de oración)", loc, texto)

    for loc, texto, es_titulo in items:
        bajo = texto.lower()
        corto = texto if len(texto) <= 110 else texto[:107] + "..."

        if "—" in texto:
            add("Guion largo (—)", loc, corto)
        if "–" in texto:
            add("Guion medio (–): usar '-' en rangos", loc, corto)
        if EMOJI_RE.search(texto):
            add("Emoji", loc, corto)
        titulo_pregunta = texto.strip().startswith("¿") and texto.strip().endswith("?") and len(texto) < 90
        if "¿" in texto and not es_titulo and not titulo_pregunta:
            add("Pregunta en cuerpo (¿...?)", loc, corto)

        sin_urls = re.sub(r"https?://\S+", "", texto)
        for oracion in re.split(r"(?<=[.!?])\s+", sin_urls):
            if oracion.count(":") >= 2 and not re.search(r"\d:\d", oracion) and "·" not in oracion:
                frag = oracion if len(oracion) <= 110 else oracion[:107] + "..."
                add("Más de un ':' en una oración", loc, frag)

        for grupo, lista in (("Adverbio/relleno", ADVERBIOS), ("Promesa sin dato (verificar)", PROMESAS),
                             ("Meta-narración / justificación", META), ("Lenguaje de 'versión nueva'", VERSION)):
            for w in lista:
                if w in bajo:
                    add(f"{grupo}: '{w}'", loc, corto)

        conteo["no es"] += len(re.findall(r"\bno es\b", bajo))
        conteo["sino"] += len(re.findall(r"\bsino\b", bajo))
        conteo["en lugar de / en vez de"] += len(re.findall(r"en lugar de|en vez de", bajo))
        conteo["periodo"] += len(re.findall(r"\bperiodos?\b", bajo))
        conteo["período"] += len(re.findall(r"\bperíodos?\b", bajo))
        conteo["decimal con coma"] += len(re.findall(r"\d,\d{1,2}(?!\d)", texto))
        conteo["decimal con punto"] += len(re.findall(r"(?<![\d.])\d+\.\d{1,2}(?![\d.])", texto))

        if titulos_num:
            for ref in REF_RE.findall(texto):
                if ref not in titulos_num and ref.split(".")[0] in {t.split(".")[0] for t in titulos_num}:
                    add("Referencia a sección inexistente", loc, f"'{ref}' en: {corto}")
                elif ref not in titulos_num and "." in ref:
                    add("Referencia a sección inexistente", loc, f"'{ref}' en: {corto}")

    return hall, conteo, titulos_num


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    path = sys.argv[1]
    ext = Path(path).suffix.lower()
    if ext == ".docx":
        items = extraer_docx(path)
    elif ext in (".js", ".ts", ".py"):
        items = extraer_codigo(path)
    else:
        items = extraer_texto(path)

    hall, conteo, titulos = revisar(items)
    sys.stdout.reconfigure(encoding="utf-8")
    print(f"Archivo: {path}  ({len(items)} bloques de texto, {len(titulos)} títulos numerados)\n")

    if not hall:
        print("Sin señales mecánicas detectadas.")
    for clave in sorted(hall, key=lambda k: -len(hall[k])):
        casos = hall[clave]
        print(f"[{len(casos)}] {clave}")
        for loc, frag in casos[:MAX_EJEMPLOS]:
            print(f"     {loc}: {frag}")
        if len(casos) > MAX_EJEMPLOS:
            print(f"     ... y {len(casos) - MAX_EJEMPLOS} más")
        print()

    print("Patrones de frecuencia (revisar si son altos):")
    print(f"  'no es' + 'sino': {conteo['no es'] + conteo['sino']}  (contraste 'no es X, es Y'; >3 suele ser muletilla)")
    print(f"  'en lugar de'/'en vez de': {conteo['en lugar de / en vez de']}")
    if conteo["periodo"] and conteo["período"]:
        print(f"  Grafía mezclada: periodo={conteo['periodo']} / período={conteo['período']}")
    if conteo["decimal con coma"] and conteo["decimal con punto"]:
        print(f"  Separador decimal mezclado: coma={conteo['decimal con coma']} / punto={conteo['decimal con punto']}")


if __name__ == "__main__":
    main()
