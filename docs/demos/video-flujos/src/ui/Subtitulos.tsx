import React from 'react';
import { BANDA, COLOR } from '../tema';
import { partirEnLineas } from './lineas';

export const Subtitulos: React.FC<{ texto: string | null }> = ({ texto }) => {
  if (!texto) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: BANDA,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: COLOR.blanco,
        fontSize: 40,
        fontWeight: 700,
        lineHeight: 1.25,
      }}
    >
      {partirEnLineas(texto).map((linea) => (
        <div key={linea}>{linea}</div>
      ))}
    </div>
  );
};
