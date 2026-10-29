undef $/; $_=<STDIN>;
s/  const \[opciones, setOpciones\] = useState<Species\[\]>\(\[\]\);\n  const \[buscando, setBuscando\] = useState\(false\);\n/  \/\/ La respuesta guarda el texto que la produjo: así «buscando» y las opciones se\n  \/\/ derivan en el render y el efecto solo escribe estado al resolver la promesa.\n  const [respuesta, setRespuesta] = useState<{ texto: string; opciones: Species[] } | null>(null);\n/;
s/  const elegida = valor !== '' && texto === valor;\n/  const elegida = valor !== '' && texto === valor;\n  const consultable = buscado.trim().length >= 2 && buscado !== valor;\n  const respondida = respuesta?.texto === buscado;\n  const opciones = consultable && respondida ? respuesta.opciones : [];\n  const buscando = consultable && !respondida;\n/;
s/    let vigente = true;\n    if \(buscado.trim\(\).length < 2 \|\| buscado === valor\) \{\n      setOpciones\(\[\]\);\n      setBuscando\(false\);\n      return;\n    \}\n\n    setBuscando\(true\);\n/    if (!consultable) return;\n    let vigente = true;\n/;
s/        if \(vigente\) \{\n          setOpciones\(p.content\);\n          setBuscando\(false\);\n        \}/        if (vigente) setRespuesta({ texto: buscado, opciones: p.content });/;
s/        if \(vigente\) \{\n          setOpciones\(\[\]\);\n          setBuscando\(false\);\n        \}/        if (vigente) setRespuesta({ texto: buscado, opciones: [] });/;
s/  \}, \[buscado, valor\]\);/  }, [buscado, consultable]);/;
s/    setTexto\(s.scientificName\);\n    setOpciones\(\[\]\);\n/    setTexto(s.scientificName);\n/;
print;
