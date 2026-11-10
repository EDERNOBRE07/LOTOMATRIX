import { GameTicket } from '../types/lotofacil';

/**
 * Exporta os cartões em formato TXT posicional estrito aceito por Cologa e L-Godoi.
 * Cada linha representa um volante com as 15 dezenas em 2 dígitos separadas por espaço e quebra CRLF.
 * @param jogos Lista de jogos (GameTicket[] ou matriz de números number[][])
 * @param prefixoArquivo Nome base para o arquivo de download
 */
export function exportarParaCologaLGodoi(
  jogos: (GameTicket | number[] | { dezenas: number[] })[],
  prefixoArquivo: string = 'matriz_lotosniper'
): void {
  if (!jogos || jogos.length === 0) return;

  const CRLF = '\r\n';

  // Mapeia cada jogo para uma linha com dezenas de 2 dígitos separadas por espaço
  const linhas = jogos.map((item) => {
    const dezenas = Array.isArray(item) ? item : item.dezenas;
    return [...dezenas]
      .sort((a, b) => a - b)
      .map((d) => String(d).padStart(2, '0'))
      .join(' ');
  });

  // Monta o arquivo em texto puro com quebras de linha Windows CRLF
  const conteudoTexto = linhas.join(CRLF) + CRLF;

  // Blob com charset ANSI / UTF-8 compatível com Windows antigo, Cologa e L-Godoi
  const blob = new Blob([conteudoTexto], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${prefixoArquivo}_cologa.txt`;
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 150);
}
