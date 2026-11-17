// Campo generativo para la capa ilustrativa «zonas de más atención» (idea del arte algorítmico de
// anthropics/skills): partículas que nacen cerca de cada foco y siguen un flujo suave, como calor
// que sube. Calmo y determinista: la posición de cada partícula se integra desde su nacimiento.
import { random } from 'remotion';

export type Foco = { x: number; y: number; peso: number };
export type Particula = { x: number; y: number; opacidad: number; edad: number; calor: number; estela: { x: number; y: number }[] };

const VIDA = 110;
const PASO = 1.6;
const RADIO = 150;
const LARGO_ESTELA = 7;

/** Ángulo del flujo en un punto: suma de ondas lentas (sin ruido externo, sin dependencias). */
function angulo(x: number, y: number, t: number): number {
  return Math.sin(x / 210 + t * 0.004) * 1.3 + Math.cos(y / 170 - t * 0.003) * 1.1 - Math.PI / 2;
}

export function campoDeAtencion(frame: number, focos: Foco[], semilla: string, cuantas = 220): Particula[] {
  if (focos.length === 0) return [];
  const total = focos.reduce((s, f) => s + f.peso, 0);
  return Array.from({ length: cuantas }, (_, i) => {
    // El foco se elige según su peso: el que pide más atención junta más partículas.
    let r = random(`${semilla}-f${i}`) * total;
    const foco = focos.find((f) => (r -= f.peso) < 0) ?? focos[focos.length - 1];
    const desfase = Math.floor(random(`${semilla}-d${i}`) * VIDA);
    const edad = (frame + desfase) % VIDA;
    const vida = Math.floor((frame + desfase) / VIDA);
    const a = random(`${semilla}-a${i}-${vida}`) * Math.PI * 2;
    const d = Math.sqrt(random(`${semilla}-r${i}-${vida}`)) * RADIO;
    let x = foco.x + Math.cos(a) * d;
    let y = foco.y + Math.sin(a) * d * 0.7;
    const estela: { x: number; y: number }[] = [{ x, y }];
    for (let k = 0; k < edad; k++) {
      const g = angulo(x, y, frame - edad + k);
      x += Math.cos(g) * PASO;
      y += Math.sin(g) * PASO;
      estela.push({ x, y });
      if (estela.length > LARGO_ESTELA) estela.shift();
    }
    if (estela.length < 2) estela.push({ x: x + 0.5, y: y - 0.5 });
    const opacidad = Math.min(1, edad / 18, (VIDA - edad) / 24);
    return { x, y, opacidad: Math.max(0, opacidad), edad, calor: Math.max(0, 1 - d / RADIO) * foco.peso, estela };
  });
}
