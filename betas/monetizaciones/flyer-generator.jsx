import { useState, useRef, useCallback } from "react";

const SYSTEM_PROMPT = `Sos un diseñador gráfico senior especialista en marketing digital y publicidad para redes sociales con más de 15 años de experiencia. Tu especialidad es crear flyers de alto impacto para Instagram y Facebook que generan conversiones reales.

Cuando recibís imágenes y datos de un negocio, tu tarea es:

1. ANALIZAR las imágenes recibidas (productos, logos, fotos del local, trabajos realizados) y extraer los elementos visuales clave
2. DISEÑAR un concepto visual completo y profesional para el flyer
3. CORREGIR cualquier error ortográfico en los textos (tildes, puntuación, mayúsculas en español argentino)
4. GENERAR un prompt optimizado en inglés para generadores de imágenes (Midjourney/DALL-E/Firefly)

## REGLAS ABSOLUTAS DE TEXTO
- Revisá CADA palabra: tildes, signos ¡! ¿?, mayúsculas
- NUNCA inventés datos (precios, teléfonos, fechas) que no te dieron
- Si hay datos contradictorios, preguntá cuál es el correcto
- Español argentino: "vos", "mirá", tildes en mayúsculas (Á, É, Í, Ó, Ú)

## ESTRUCTURA DE TU RESPUESTA (seguila exactamente)

### 🎯 CONCEPTO VISUAL
Descripción del flyer (composición, jerarquía, disposición de elementos)

### 🎨 PALETA DE COLORES
- Color principal: [nombre] → HEX #XXXXXX
- Color secundario: [nombre] → HEX #XXXXXX  
- Color acento: [nombre] → HEX #XXXXXX
- Fondo: [descripción] → HEX #XXXXXX

### ✍️ TIPOGRAFÍAS SUGERIDAS
- Titular: [fuente] (disponible en Google Fonts: sí/no)
- Cuerpo: [fuente]
- Combinación: [por qué funcionan juntas]

### 📝 TEXTO EXACTO DEL FLYER (ya corregido)
[Cada elemento de texto del flyer, en orden de jerarquía visual]

### ⚠️ ERRORES ENCONTRADOS Y CORRECCIONES
[Lista de errores ortográficos, datos inconsistentes o problemas detectados]

### 🖼️ PROMPT PARA GENERADOR DE IMÁGENES
[Prompt completo en inglés, listo para copiar y pegar en Midjourney, DALL-E 3 o Adobe Firefly]

### 📐 FORMATO RECOMENDADO
[Qué formato/s usar y por qué, con dimensiones exactas]

### 🛠️ HERRAMIENTA PARA ARMAR EL FLYER
[Canva / Adobe Express / Photoshop y por qué para este caso específico]`;

const PLACEHOLDER = {
  negocio: "Ej: MR Letreros — fabricación de carteles y letreros luminosos",
  oferta: "Ej: Combo Emprendedor: cartel front + pastilla LED + 2 fly banners",
  precio: "Ej: $650.000 precio promocional",
  contacto: "Ej: WhatsApp 342 513 6868 | @mrletreros | JP Lopez 3162",
  tono: "Ej: Profesional, impactante, directo. Colores amarillo y negro",
  extra: "Ej: Destacar que son ejemplos reales de trabajos propios. Incluir los 3 items del combo con numeración",
};

export default function FlyerGenerator() {
  const [images, setImages] = useState([]);
  const [form, setForm] = useState({ negocio: "", oferta: "", precio: "", contacto: "", tono: "", extra: "" });
  const [formato, setFormato] = useState("instagram_feed");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const addFiles = useCallback(async (files) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 8);
    const newImgs = await Promise.all(
      valid.map(async (f) => ({
        name: f.name,
        type: f.type,
        preview: URL.createObjectURL(f),
        b64: await toBase64(f),
      }))
    );
    setImages((prev) => [...prev, ...newImgs].slice(0, 8));
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const formatosMap = {
    instagram_feed: "Instagram Feed 1080×1080 px (1:1) — cuadrado",
    instagram_vertical: "Instagram Feed 1080×1350 px (4:5) — vertical",
    instagram_story: "Instagram / Facebook Story 1080×1920 px (9:16)",
    facebook_feed: "Facebook Feed 1200×630 px (1.91:1) — horizontal",
  };

  const generate = async () => {
    if (!form.negocio.trim()) { setError("Completá al menos el nombre del negocio."); return; }
    setLoading(true);
    setError(null);
    setResult(null);

    const imgContent = images.map((img) => ({
      type: "image",
      source: { type: "base64", media_type: img.type, data: img.b64 },
    }));

    const textContent = {
      type: "text",
      text: `Necesito que diseñes el concepto de un flyer profesional para redes sociales.

## DATOS DEL NEGOCIO
- **Negocio / Rubro:** ${form.negocio || "No especificado"}
- **Oferta / Servicio a destacar:** ${form.oferta || "No especificado"}
- **Precio / Condición:** ${form.precio || "No especificado"}
- **Contacto:** ${form.contacto || "No especificado"}
- **Tono y colores de marca:** ${form.tono || "No especificado"}
- **Información adicional:** ${form.extra || "Ninguna"}
- **Formato objetivo:** ${formatosMap[formato]}

${images.length > 0
  ? `## IMÁGENES SUBIDAS (${images.length})
Las imágenes adjuntas contienen: ${images.map((i) => i.name).join(", ")}
Analizalas y usá sus elementos visuales, colores y estilo en el concepto del flyer.`
  : "## SIN IMÁGENES\nNo se subieron imágenes. Diseñá el concepto basado solo en los datos del negocio."
}

Seguí exactamente la estructura de respuesta indicada en el sistema.`,
    };

    const content = images.length > 0 ? [...imgContent, textContent] : [textContent];

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content?.find((b) => b.type === "text")?.text || "";
      setResult(text);
    } catch (e) {
      setError("Error al conectar con la IA: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = () => {
    if (!result) return;
    const match = result.match(/### 🖼️ PROMPT PARA GENERADOR DE IMÁGENES\n([\s\S]*?)(?=###|$)/);
    const text = match ? match[1].trim() : result;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const copyAll = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sections = result
    ? result.split(/(?=### )/).filter(Boolean).map((s) => {
        const lines = s.split("\n");
        const title = lines[0].replace("### ", "").trim();
        const body = lines.slice(1).join("\n").trim();
        return { title, body };
      })
    : [];

  const sectionColor = (title) => {
    if (title.includes("PALETA")) return "#fbbf24";
    if (title.includes("TEXTO")) return "#34d399";
    if (title.includes("PROMPT")) return "#60a5fa";
    if (title.includes("ERROR")) return "#f87171";
    if (title.includes("CONCEPTO")) return "#a78bfa";
    if (title.includes("FORMATO")) return "#fb923c";
    return "#e5e7eb";
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#0a0a0a", minHeight: "100vh", color: "#f5f5f5" }}>

      {/* Header */}
      <div style={{ background: "#111", borderBottom: "3px solid #fbbf24", padding: "20px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ background: "#fbbf24", color: "#000", fontWeight: 800, fontSize: 13, padding: "4px 10px", borderRadius: 4, letterSpacing: 2 }}>MR</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: 1, color: "#fff" }}>GENERADOR DE FLYERS IA</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Subí tus imágenes · Completá los datos · Obtenés el concepto + prompt profesional</div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>

        {/* Upload zone */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24", letterSpacing: 1, display: "block", marginBottom: 10 }}>
            📁 IMÁGENES DE REFERENCIA (máx. 8)
          </label>
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "#fbbf24" : "#333"}`,
              borderRadius: 12,
              padding: "28px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: dragOver ? "rgba(251,191,36,0.06)" : "#111",
              transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
            <div style={{ color: "#aaa", fontSize: 14 }}>
              Arrastrá imágenes acá o <span style={{ color: "#fbbf24", fontWeight: 600 }}>hacé click para seleccionar</span>
            </div>
            <div style={{ color: "#555", fontSize: 12, marginTop: 6 }}>Fotos del local, productos, logos, trabajos realizados · JPG, PNG, WEBP</div>
            <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: "none" }}
              onChange={(e) => addFiles(e.target.files)} />
          </div>

          {images.length > 0 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              {images.map((img, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={img.preview} alt={img.name}
                    style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "2px solid #333" }} />
                  <button onClick={() => removeImage(i)}
                    style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", border: "none", borderRadius: "50%",
                      width: 20, height: 20, color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  <div style={{ fontSize: 9, color: "#666", textAlign: "center", marginTop: 3, maxWidth: 80,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form */}
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "20px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24", letterSpacing: 1, marginBottom: 16 }}>
            📋 DATOS DEL FLYER
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              ["negocio", "🏢 Negocio / Rubro *", "text"],
              ["oferta", "🎯 Oferta / Servicio a destacar", "text"],
              ["precio", "💰 Precio / Condición", "text"],
              ["contacto", "📞 Datos de contacto", "text"],
              ["tono", "🎨 Tono y colores de marca", "text"],
            ].map(([key, label]) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>{label}</label>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={PLACEHOLDER[key]}
                  style={{
                    background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8,
                    color: "#f5f5f5", fontSize: 13, padding: "9px 12px", outline: "none",
                    transition: "border 0.2s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#fbbf24"}
                  onBlur={(e) => e.target.style.borderColor = "#2a2a2a"}
                />
              </div>
            ))}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>📐 Formato objetivo</label>
              <select value={formato} onChange={(e) => setFormato(e.target.value)}
                style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8,
                  color: "#f5f5f5", fontSize: 13, padding: "9px 12px", outline: "none" }}>
                <option value="instagram_feed">Instagram Feed (1:1) 1080×1080</option>
                <option value="instagram_vertical">Instagram Feed (4:5) 1080×1350 ⭐ más alcance</option>
                <option value="instagram_story">Story (9:16) 1080×1920</option>
                <option value="facebook_feed">Facebook Feed (1.91:1) 1200×630</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 12, color: "#888", fontWeight: 500, display: "block", marginBottom: 6 }}>
              📝 Información adicional / Instrucciones especiales
            </label>
            <textarea
              value={form.extra}
              onChange={(e) => setForm((f) => ({ ...f, extra: e.target.value }))}
              placeholder={PLACEHOLDER.extra}
              rows={3}
              style={{
                width: "100%", background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8,
                color: "#f5f5f5", fontSize: 13, padding: "9px 12px", outline: "none",
                resize: "vertical", boxSizing: "border-box",
              }}
              onFocus={(e) => e.target.style.borderColor = "#fbbf24"}
              onBlur={(e) => e.target.style.borderColor = "#2a2a2a"}
            />
          </div>
        </div>

        {/* Generate button */}
        <button onClick={generate} disabled={loading}
          style={{
            width: "100%", padding: "16px", background: loading ? "#333" : "#fbbf24",
            color: loading ? "#888" : "#000", fontWeight: 800, fontSize: 15, border: "none",
            borderRadius: 10, cursor: loading ? "not-allowed" : "pointer", letterSpacing: 1,
            transition: "all 0.2s", marginBottom: 20,
          }}>
          {loading ? "⏳ GENERANDO CONCEPTO DE FLYER..." : "⚡ GENERAR FLYER PROFESIONAL CON IA"}
        </button>

        {error && (
          <div style={{ background: "#1f0000", border: "1px solid #ef4444", borderRadius: 10, padding: 16, marginBottom: 20, color: "#f87171", fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Result */}
        {sections.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#fbbf24" }}>✅ RESULTADO DEL DISEÑO</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={copyPrompt}
                  style={{ background: "#1e3a5f", color: "#60a5fa", border: "1px solid #1e40af",
                    borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                  {copied ? "✓ Copiado" : "📋 Copiar prompt IA"}
                </button>
                <button onClick={copyAll}
                  style={{ background: "#1a1a1a", color: "#aaa", border: "1px solid #333",
                    borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: "pointer" }}>
                  📄 Copiar todo
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {sections.map((sec, i) => (
                <div key={i} style={{ background: "#111", border: `1px solid #222`, borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ background: "#161616", borderBottom: "1px solid #222", padding: "12px 16px",
                    display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 3, height: 18, background: sectionColor(sec.title), borderRadius: 2 }} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: sectionColor(sec.title), letterSpacing: 0.5 }}>
                      {sec.title}
                    </span>
                  </div>
                  <div style={{ padding: "14px 16px" }}>
                    <pre style={{
                      fontFamily: "inherit", fontSize: 13, lineHeight: 1.8, color: "#d4d4d4",
                      margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>
                      {sec.body}
                    </pre>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, background: "#0f1a0f", border: "1px solid #1a3a1a", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#6ee7b7", fontWeight: 600, marginBottom: 6 }}>💡 PRÓXIMOS PASOS</div>
              <div style={{ fontSize: 12, color: "#888", lineHeight: 1.8 }}>
                1. Copiá el <strong style={{ color: "#60a5fa" }}>Prompt para Generador de Imágenes</strong> → pegalo en Midjourney, DALL-E 3 o Adobe Firefly<br />
                2. Generá la imagen base <strong>SIN texto</strong> para evitar errores ortográficos de la IA<br />
                3. Importá la imagen en <strong style={{ color: "#fbbf24" }}>Canva o Adobe Express</strong><br />
                4. Agregá el texto exacto de la sección <strong style={{ color: "#34d399" }}>TEXTO EXACTO DEL FLYER</strong><br />
                5. Usá las tipografías y paleta de colores indicadas → ¡Listo para publicar!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
