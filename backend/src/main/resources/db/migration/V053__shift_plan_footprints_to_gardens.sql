-- Propiedad de SPEC-108 (ubicación del plano). Corrección del 14 nov 2026, a pedido de Jean Piero: vistos desde
-- arriba, los edificios del plano oficial pisaban los jardines porque SPEC-108 ubicó el SKP contra OpenStreetMap y
-- los jardines (siembra V011) vienen de otra fuente. Medido sobre todo el campus, el plano está 2,6 m al este y
-- 2,6 m al norte de los jardines, sin giro. El anclaje del manifiesto edificios-plano.json se corrió lo mismo (el GLB
-- no cambia: sus posiciones son relativas al anclaje); aquí se corren las huellas de lo que el visor dibuja con ese
-- modelo: las del SKP y la de la caseta del edificio 95, que es OpenStreetMap pero lleva la malla de la caseta C-3446
-- ajustada a su contorno (D-04). Las demás de OpenStreetMap no se tocan. Los grados son los 2,6 m a la latitud del
-- anclaje (radios WGS84, como el visor). El trigger de campus_buildings sube map_data_version.
UPDATE campus_buildings
   SET footprint = ST_Translate(footprint, -0.000023880677126684355, -0.000023503283647569735),
       updated_at = CURRENT_TIMESTAMP
 WHERE (source = 'PUCP' OR plan_key = 'b9a4a553-9c25-45f2-b2fc-43592ab2b917') AND deleted_at IS NULL;
