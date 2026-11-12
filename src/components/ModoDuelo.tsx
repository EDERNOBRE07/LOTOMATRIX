import React from 'react';
import {
  AlgorithmDuelSimulator,
  AlgorithmDuelSimulatorProps,
  StrategyKey,
} from './AlgorithmDuelSimulator';

export type { AlgorithmDuelSimulatorProps, StrategyKey };

/**
 * Componente ModoDuelo
 * 
 * Permite a comparação da Garantia Canônica de 14 Pontos contra o Filtro de IA,
 * além de realizar a auditoria automática de backups de fechamentos contra o
 * concurso sorteado da Caixa, destacando o melhor bilhete e os fechamentos com
 * taxa de premiação superior a 50%.
 */
export const ModoDuelo: React.FC<AlgorithmDuelSimulatorProps> = (props) => {
  return <AlgorithmDuelSimulator {...props} />;
};

export default ModoDuelo;
