# Genera app/estilos.css: cuatro paletas intercambiables por [data-estilo].
E = {}

E['ladrillo'] = dict(
  claro=dict(hueso="242 244 249", huesoA="255 255 255", huesoB="247 248 252", huesoM="232 236 245",
    pieza="#FFFFFF",
    t950="16 22 34", t900="30 38 54", t700="66 76 96", t500="104 116 138", t400="148 158 176", t300="202 209 221",
    trazo=(".09",".15",".30"), trazoRGB="16, 22, 34",
    minio=("130 26 20","166 33 26","202 52 32","251 233 228"),
    cian=("46 60 84","74 92 122","108 128 160","231 236 244"),
    sem=("22 101 78","170 116 22","166 33 26"),
    etapa=("#C7CFDD","#A6B3C7","#8493AE","#647596","#47587A","#2A3852"),
    halo=("rgba(202, 52, 32, .07)","rgba(108, 128, 160, .07)","rgba(16, 22, 34, .03)"),
    aurora=("#CA3420","#E88A70","#647596","#2A3852",".17"),
    matriz=("#A6211A","#E3A79E","#F6DED9","#8493AE"),
    panelTinta="#FBEDEA",
    panel="radial-gradient(40rem 26rem at 86% -12%, rgba(226, 88, 58, .30), transparent 66%), radial-gradient(30rem 20rem at 8% 118%, rgba(108, 128, 160, .22), transparent 62%), linear-gradient(152deg, rgb(120 26 20), rgb(74 18 14))"),
  oscuro=dict(hueso="12 15 23", huesoA="21 26 38", huesoB="16 20 30", huesoM="30 37 52",
    pieza="rgba(226, 233, 245, .05)",
    t950="240 244 250", t900="221 228 239", t700="176 187 205", t500="133 145 166", t400="102 114 134", t300="71 82 101",
    trazo=(".09",".15",".26"), trazoRGB="226, 233, 245",
    minio=("228 122 96","236 136 110","242 152 126","62 26 20"),
    cian=("196 208 226","168 182 204","140 156 182","28 36 52"),
    sem=("106 190 156","214 178 104","236 128 108"),
    etapa=("#39435A","#4C5A76","#647592","#8090AE","#A4B2C9","#D2DAE8"),
    halo=("rgba(242, 152, 126, .10)","rgba(140, 156, 182, .08)","rgba(226, 233, 245, .03)"),
    aurora=("#E4614A","#F0947C","#8C9CB6","#22293A",".16"),
    matriz=("#E47A62","#7A342A","#2A1D1B","#5A6478"),
    panelTinta="#FBEDEA",
    panel="radial-gradient(40rem 26rem at 86% -12%, rgba(242, 152, 126, .22), transparent 66%), radial-gradient(30rem 20rem at 8% 118%, rgba(140, 156, 182, .16), transparent 62%), linear-gradient(152deg, rgb(86 24 18), rgb(38 16 14))"),
)

E['cobalto'] = dict(
  claro=dict(hueso="250 251 253", huesoA="255 255 255", huesoB="244 247 251", huesoM="233 240 249",
    pieza="#FFFFFF",
    t950="8 12 22", t900="20 27 42", t700="58 70 92", t500="100 114 138", t400="145 158 178", t300="200 210 224",
    trazo=(".09",".16",".32"), trazoRGB="8, 12, 22",
    minio=("10 62 150","16 86 200","28 110 235","219 233 252"),
    cian=("22 92 148","56 140 200","108 186 238","224 242 253"),
    sem=("16 86 200","112 132 158","214 40 57"),
    etapa=("#A8D4EF","#79BAE4","#4B96D4","#2A6FC0","#1B4B8F","#0E2647"),
    halo=("rgba(28, 110, 235, .07)","rgba(108, 186, 238, .07)","rgba(8, 12, 22, .03)"),
    aurora=("#1C6EEB","#6CBAEE","#0A3E96","#0E2647",".18"),
    matriz=("#1056C8","#9CB8E8","#DCE7F7","#8C9CB4"),
    panelTinta="#EEF4FF",
    panel="radial-gradient(38rem 24rem at 88% -10%, rgba(28, 110, 235, .40), transparent 64%), radial-gradient(30rem 20rem at 10% 120%, rgba(108, 186, 238, .18), transparent 60%), linear-gradient(152deg, rgb(16 22 38), rgb(8 12 22))"),
  oscuro=dict(hueso="9 12 20", huesoA="17 22 34", huesoB="13 17 27", huesoM="26 33 48",
    pieza="rgba(226, 240, 255, .05)",
    t950="244 248 253", t900="226 233 242", t700="180 192 209", t500="136 150 170", t400="104 118 138", t300="72 85 104",
    trazo=(".09",".15",".26"), trazoRGB="226, 240, 255",
    minio=("146 186 250","122 170 248","100 156 246","18 34 60"),
    cian=("196 226 248","166 210 245","136 194 240","16 34 52"),
    sem=("122 170 248","150 168 190","240 110 120"),
    etapa=("#234066","#2F5C90","#3D7CBC","#559BD8","#86BEEA","#C8E3F7"),
    halo=("rgba(100, 156, 246, .12)","rgba(136, 194, 240, .08)","rgba(226, 240, 255, .03)"),
    aurora=("#2E7BF6","#7FC4F0","#0F3C86","#16233C",".17"),
    matriz=("#6E9CF6","#25406E","#182234","#566078"),
    panelTinta="#EEF4FF",
    panel="radial-gradient(38rem 24rem at 88% -10%, rgba(100, 156, 246, .28), transparent 64%), radial-gradient(30rem 20rem at 10% 120%, rgba(136, 194, 240, .14), transparent 60%), linear-gradient(152deg, rgb(20 27 44), rgb(9 12 20))"),
)

E['espresso'] = dict(
  claro=dict(hueso="250 246 238", huesoA="255 252 246", huesoB="246 241 231", huesoM="240 233 220",
    pieza="#FFFCF6",
    t950="44 31 23", t900="62 45 34", t700="104 84 68", t500="142 122 104", t400="174 157 139", t300="213 201 185",
    trazo=(".10",".17",".32"), trazoRGB="44, 31, 23",
    minio=("146 66 10","176 82 14","198 100 26","246 229 210"),
    cian=("34 56 38","52 82 56","74 110 78","225 234 224"),
    sem=("52 96 60","172 116 26","168 52 32"),
    etapa=("#C9B39A","#B5977A","#9E7B5C","#855F41","#68472F","#46301F"),
    halo=("rgba(198, 100, 26, .07)","rgba(74, 110, 78, .05)","rgba(44, 31, 23, .035)"),
    aurora=("#C6641A","#E0A268","#4A6E4E","#46301F",".18"),
    matriz=("#B0520E","#DEB48E","#F2E4D3","#8C9C86"),
    panelTinta="#FAF3E9",
    panel="radial-gradient(38rem 24rem at 88% -10%, rgba(198, 100, 26, .22), transparent 62%), linear-gradient(152deg, rgb(58 41 30), rgb(38 27 20))"),
  oscuro=dict(hueso="24 18 14", huesoA="34 26 20", huesoB="29 22 17", huesoM="45 35 27",
    pieza="rgba(255, 244, 230, .05)",
    t950="250 245 237", t900="235 227 216", t700="197 184 169", t500="156 141 126", t400="122 108 95", t300="88 76 65",
    trazo=(".09",".15",".26"), trazoRGB="255, 244, 230",
    minio=("226 150 86","234 164 100","240 178 118","74 44 22"),
    cian=("156 190 158","138 176 142","124 164 128","34 48 36"),
    sem=("132 186 136","220 182 108","226 118 96"),
    etapa=("#6B5138","#85674A","#A0805F","#BC9C78","#D6BA9A","#EFDCC4"),
    halo=("rgba(240, 178, 118, .10)","rgba(124, 164, 128, .07)","rgba(255, 244, 230, .03)"),
    aurora=("#E08A3C","#F0B278","#7CA480","#8A5A2E",".15"),
    matriz=("#E8A470","#6B4526","#2A2018","#6B7A64"),
    panelTinta="#FAF3E9",
    panel="radial-gradient(38rem 24rem at 88% -10%, rgba(240, 178, 118, .16), transparent 62%), linear-gradient(152deg, rgb(52 39 30), rgb(30 22 17))"),
)

E['monocromo'] = dict(
  claro=dict(hueso="250 250 249", huesoA="255 255 255", huesoB="246 246 244", huesoM="240 240 237",
    pieza="#FFFFFF",
    t950="9 15 5", t900="24 30 20", t700="61 68 56", t500="106 114 100", t400="150 157 144", t300="205 209 201",
    trazo=(".09",".16",".32"), trazoRGB="9, 15, 5",
    minio=("24 24 24","38 38 38","64 64 64","232 232 231"),
    cian=("32 32 32","68 68 68","110 110 110","235 235 234"),
    sem=("24 24 24","122 122 122","199 44 33"),
    etapa=("#B4B4B2","#969694","#787876","#565654","#3A3A38","#1C1C1A"),
    halo=("rgba(9, 15, 5, .05)","rgba(9, 15, 5, .04)","rgba(9, 15, 5, .03)"),
    aurora=("#2A2A28","#6E6E6C","#4A4A48","#8C8C8A",".13"),
    matriz=("#4A4A48","#AEAEAC","#E2E2E0","#8C8C8A"),
    panelTinta="#F4F4F2",
    panel="radial-gradient(38rem 24rem at 88% -10%, rgba(90, 90, 88, .30), transparent 64%), linear-gradient(152deg, rgb(38 38 36), rgb(18 18 16))"),
  oscuro=dict(hueso="10 11 13", huesoA="20 21 24", huesoB="15 16 19", huesoM="28 29 33",
    pieza="rgba(255, 255, 255, .045)",
    t950="247 248 248", t900="228 230 233", t700="183 187 194", t500="138 143 152", t400="107 112 121", t300="75 79 87",
    trazo=(".08",".14",".24"), trazoRGB="255, 255, 255",
    minio=("214 214 214","232 232 232","246 246 246","44 44 46"),
    cian=("190 190 192","214 214 216","236 236 238","38 38 40"),
    sem=("247 248 248","150 150 154","232 96 82"),
    etapa=("#55575C","#71747A","#8E9199","#ACAFB6","#CBCDD2","#EDEEF0"),
    halo=("rgba(255, 255, 255, .05)","rgba(255, 255, 255, .04)","rgba(255, 255, 255, .025)"),
    aurora=("#FFFFFF","#B8B8BC","#DADADE","#909094",".10"),
    matriz=("#C8C8CA","#5A5A5E","#242426","#7A7A7E"),
    panelTinta="#F4F4F2",
    panel="radial-gradient(38rem 24rem at 88% -10%, rgba(255, 255, 255, .12), transparent 64%), linear-gradient(152deg, rgb(40 41 45), rgb(16 17 20))"),
)

ETAPAS = ["factibilidad","diseno","permisos","obra","preventa","entregado"]

def bloque(sel, d):
    L = [f"{sel} {{"]
    L.append(f"  --hueso: {d['hueso']}; --hueso-alto: {d['huesoA']};")
    L.append(f"  --hueso-bajo: {d['huesoB']}; --hueso-mesa: {d['huesoM']};")
    L.append(f"  --pieza-fondo: {d['pieza']};")
    L.append(f"  --tinta-950: {d['t950']}; --tinta-900: {d['t900']}; --tinta-700: {d['t700']};")
    L.append(f"  --tinta-500: {d['t500']}; --tinta-400: {d['t400']}; --tinta-300: {d['t300']};")
    a,b,c = d['trazo']; rgb = d['trazoRGB']
    L.append(f"  --trazo-fino: rgba({rgb}, {a}); --trazo-medio: rgba({rgb}, {b}); --trazo-grueso: rgba({rgb}, {c});")
    m = d['minio']
    L.append(f"  --minio-700: {m[0]}; --minio-600: {m[1]}; --minio-500: {m[2]}; --minio-100: {m[3]};")
    cn = d['cian']
    L.append(f"  --cian-900: {cn[0]}; --cian-700: {cn[1]}; --cian-500: {cn[2]}; --cian-100: {cn[3]};")
    s = d['sem']
    L.append(f"  --viable: {s[0]}; --tenso: {s[1]}; --riesgo: {s[2]};")
    for n, v in zip(ETAPAS, d['etapa']):
        L.append(f"  --etapa-{n}: {v};")
    h = d['halo']
    L.append(f"  --halo-1: {h[0]}; --halo-2: {h[1]}; --halo-3: {h[2]};")
    au = d['aurora']
    L.append(f"  --aurora-1: {au[0]}; --aurora-2: {au[1]}; --aurora-3: {au[2]}; --aurora-4: {au[3]};")
    L.append(f"  --aurora-opacidad: {au[4]};")
    mz = d['matriz']
    L.append(f"  --matriz-letra: {mz[0]}; --matriz-aura: {mz[1]};")
    L.append(f"  --matriz-campo: {mz[2]}; --matriz-grano: {mz[3]};")
    L.append(f"  --panel-fondo: {d['panel']};")
    L.append(f"  --panel-tinta: {d['panelTinta']};")
    L.append("}")
    return "\n".join(L)

cab = '''/* --------------------------------------------------------------------------
   Estilos intercambiables.

   Cuatro paletas completas, seleccionables por el usuario con
   `data-estilo` en el `<html>`. No son cuatro temas de color pegados encima:
   cada una redefine el juego entero —papel, tinta, filetes, vidrios, acento,
   semántica, etapas, aurora, matriz y el fondo del panel oscuro— porque en
   este sistema el color no es una capa, es de dónde sale todo.

   La razón de que esto quepa en un fichero es la misma que la de los dos
   temas: ni Tailwind ni las pantallas llevan un solo valor de color. Todo
   apunta a estas variables, así que cambiar de estilo es cambiar un atributo.

   Sobre la especificidad, que es lo único delicado. Los tokens oscuros viven
   en `.oscuro` (0,1,0) y estos bloques usan `:root[data-estilo="x"]` (0,2,0),
   que gana. Si el bloque claro no se acotara con `:not(.oscuro)`, pisaría al
   tema oscuro y el panel saldría en claro con el tema oscuro puesto. De ahí
   que cada estilo tenga sus dos bloques explícitos.

   Los cuatro valores de `--matriz-*` son monocromos del acento y ninguno es
   negro. Con la trama a plena intensidad detrás de toda la portada, un mosaico
   en la misma tinta que el texto competía con él: los rótulos sobre las piezas
   se leían a medias y las tarjetas atenuadas, nada. En un solo matiz y sin
   llegar al extremo oscuro, las siete figuras siguen leyéndose como figuras y
   dejan de pelear con lo que tienen encima.

   `--panel-tinta` es siempre clara en los ocho bloques, y no es un descuido:
   el panel destacado es oscuro en los dos temas, así que su texto no puede
   salir de `--hueso`. Cuando salía de ahí, en tema oscuro el rótulo se pintaba
   del color del fondo de la página —oscuro sobre oscuro— y la cifra principal
   del consolidado desaparecía.

   Generado desde `scripts/gen_estilos.py`; se edita ahí, no aquí.
   -------------------------------------------------------------------------- */

'''

out = [cab]
for nombre, pack in E.items():
    out.append(f"/* ---- {nombre} ---------------------------------------------------------- */")
    out.append(bloque(f':root[data-estilo="{nombre}"]:not(.oscuro)', pack['claro']))
    out.append("")
    out.append(bloque(f':root[data-estilo="{nombre}"].oscuro', pack['oscuro']))
    out.append("")

open('app/estilos.css','w').write("\n".join(out))
print("app/estilos.css:", len("\n".join(out)), "chars")
