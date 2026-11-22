"""Processa as artes de miniatura geradas no Bing.

- token.<id>.jpg  -> src/assets/arte/token.<id>.webp  (figura sem fundo, recortada)
- andar.<id>.jpg  -> src/assets/arte/andar.<id>.webp  (faixa com 8 quadros iguais, sem fundo)

Uso: python3 -I miniaturas.py <pasta_entrada> <pasta_saida>
"""
import sys, os, glob
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ALTURA_TOKEN = 320
ALTURA_QUADRO = 260


def mascara_figura(rgb: np.ndarray) -> np.ndarray:
    """Fundo cinza liso: tudo que é parecido com a borda e está ligado a ela vira fundo."""
    h, w, _ = rgb.shape
    borda = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]).astype(float)
    fundo = np.median(borda, axis=0)
    # fundo pode ter vinheta: compara com o fundo local (desfocado) também
    dist = np.sqrt(((rgb.astype(float) - fundo) ** 2).sum(-1))
    sat = rgb.max(-1).astype(float) - rgb.min(-1).astype(float)
    # fundo liso (pouca variação na borda) pede tolerância menor, senão come figuras cinza
    var = float(np.sqrt(((borda - fundo) ** 2).sum(-1)).mean())
    tol = min(38.0, max(12.0, var * 4 + 8))
    # fundo colorido (verde) não exige baixa saturação; fundo cinza sim
    sat_fundo = float(fundo.max() - fundo.min())
    if sat_fundo > 40:
        tol = max(tol, 60.0)
        c = rgb.astype(float)
        canal = int(np.argmax(fundo))  # canal dominante do fundo (ex.: verde)
        outros = [i for i in range(3) if i != canal]
        dominante = (c[..., canal] - c[..., outros].max(-1)) > 25  # reflexo da cor do fundo
        parecido = (dist < tol) | dominante
    else:
        parecido = (dist < tol) & (sat < 22)
    rot, _ = ndimage.label(parecido)
    tocando = set(np.unique(np.concatenate([rot[0], rot[-1], rot[:, 0], rot[:, -1]]))) - {0}
    eh_fundo = np.isin(rot, list(tocando))
    fig = ~eh_fundo
    if sat_fundo > 40:
        fig &= ~parecido  # reflexos soltos da cor do fundo também saem
    fig = ndimage.binary_opening(fig, iterations=1)
    fig = ndimage.binary_fill_holes(fig)
    # remove sujeirinhas pequenas
    rot2, n = ndimage.label(fig)
    if n:
        tam = ndimage.sum(fig, rot2, range(1, n + 1))
        fig = np.isin(rot2, [i + 1 for i, t in enumerate(tam) if t > 0.002 * h * w])
    return fig


def com_alfa(img: Image.Image, fig: np.ndarray) -> Image.Image:
    a = Image.fromarray((fig * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    out = img.convert('RGBA')
    out.putalpha(a)
    return out


def recortar(im: Image.Image) -> Image.Image:
    bbox = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    return im.crop(bbox) if bbox else im


def processar_token(caminho: str, saida: str):
    img = Image.open(caminho).convert('RGB')
    fig = mascara_figura(np.array(img))
    # fica só com o maior bloco (a miniatura)
    rot, n = ndimage.label(fig)
    if n > 1:
        tam = ndimage.sum(fig, rot, range(1, n + 1))
        fig = rot == (int(np.argmax(tam)) + 1)
    im = recortar(com_alfa(img, fig))
    im = im.resize((round(im.width * ALTURA_TOKEN / im.height), ALTURA_TOKEN), Image.LANCZOS)
    im.save(saida, 'WEBP', quality=88)


def segmentos(perfil: np.ndarray, n: int):
    """Divide um perfil de ocupação em n blocos, cortando nos vales."""
    tam = len(perfil)
    cortes = [0]
    for k in range(1, n):
        alvo = tam * k // n
        janela = tam // (n * 3)
        lo, hi = max(0, alvo - janela), min(tam, alvo + janela)
        cortes.append(lo + int(np.argmin(perfil[lo:hi])))
    cortes.append(tam)
    return list(zip(cortes[:-1], cortes[1:]))


def processar_andar(caminho: str, saida: str):
    img = Image.open(caminho).convert('RGB')
    rgb = np.array(img)
    fig = mascara_figura(rgb)
    linhas = segmentos(fig.sum(1).astype(float), 2)
    quadros = []
    for (y0, y1) in linhas:
        faixa = fig[y0:y1]
        for (x0, x1) in segmentos(faixa.sum(0).astype(float), 4):
            m = np.zeros_like(fig)
            m[y0:y1, x0:x1] = fig[y0:y1, x0:x1]
            q = com_alfa(img, m).crop((x0, y0, x1, y1))
            bbox = q.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
            if bbox:
                quadros.append(q.crop(bbox))
    if len(quadros) != 8:
        raise ValueError(f'{os.path.basename(caminho)}: achei {len(quadros)} quadros')
    # mesma escala para todos (pela altura média) e pés alinhados embaixo
    alt = np.median([q.height for q in quadros])
    escala = ALTURA_QUADRO / alt
    qs = [q.resize((max(1, round(q.width * escala)), max(1, round(q.height * escala))), Image.LANCZOS) for q in quadros]
    W = max(q.width for q in qs) + 8
    H = max(q.height for q in qs) + 4
    faixa = Image.new('RGBA', (W * 8, H), (0, 0, 0, 0))
    for i, q in enumerate(qs):
        faixa.paste(q, (i * W + (W - q.width) // 2, H - q.height), q)
    faixa.save(saida, 'WEBP', quality=85)
    return W, H


if __name__ == '__main__':
    ent, sai = sys.argv[1], sys.argv[2]
    for c in sorted(glob.glob(os.path.join(ent, '*.jpg'))):
        nome = os.path.basename(c)[:-4]
        destino = os.path.join(sai, nome + '.webp')
        try:
            if nome.startswith('token.'):
                processar_token(c, destino)
                print('ok', nome)
            elif nome.startswith('andar.'):
                print('ok', nome, processar_andar(c, destino))
        except Exception as e:  # noqa: BLE001
            print('ERRO', nome, e)
