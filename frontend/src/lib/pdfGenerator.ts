import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ProcessoTFD } from '../types';

/**
 * Gera a Capa do Processo TFD
 */
export function gerarCapaProcesso(processo: ProcessoTFD) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cabeçalho
    doc.setFontSize(10);
    doc.text('ESTADO DO AMAZONAS', pageWidth / 2, 15, { align: 'center' });
    doc.text('SECRETARIA MUNICIPAL DE SAÚDE', pageWidth / 2, 20, { align: 'center' });
    doc.text('DIRCA - DIREÇÃO DE REGULAÇÃO, CONTROLE E AVALIAÇÃO', pageWidth / 2, 25, { align: 'center' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CAPA DE PROCESSO TFD', pageWidth / 2, 40, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(20, 45, pageWidth - 20, 45);

    // Número do Processo (Destaque)
    doc.setFontSize(24);
    doc.text(processo.numero, pageWidth / 2, 60, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data de Abertura: ${format(new Date(processo.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, pageWidth / 2, 68, { align: 'center' });

    // Tabela de Dados do Paciente
    autoTable(doc, {
        startY: 80,
        head: [['DADOS DO PACIENTE', '']],
        body: [
            ['Nome Completo:', processo.paciente?.nome || ''],
            ['CPF:', processo.paciente?.cpf || ''],
            ['Cartão SUS:', processo.paciente?.cartaoSus || '—'],
            ['Município de Origem:', processo.unidadeOrigem?.nome || '—'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], fontSize: 11 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    });

    // Tabela de Dados Clínicos
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['INFORMAÇÕES CLÍNICAS', '']],
        body: [
            ['Especialidade:', processo.especialidade],
            ['CID-10:', processo.cid],
            ['Médico Solicitante:', processo.medicoSolicitante],
            ['Prioridade:', processo.prioridade === 3 ? 'EMERGÊNCIA' : processo.prioridade === 2 ? 'URGENTE' : 'NORMAL'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], fontSize: 11 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    });

    // Tabela de Destino e Transporte
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['DESTINO E LOGÍSTICA', '']],
        body: [
            ['Cidade Destino:', `${processo.cidadeDestino} - ${processo.ufDestino}`],
            ['Hospital/Clínica:', processo.hospitalDestino || '—'],
            ['Tipo de Transporte:', processo.tipoTransporte],
            ['Acompanhante:', processo.acompanhante ? `SIM (${processo.nomeAcompanhante || 'Não informado'})` : 'NÃO'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], fontSize: 11 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    });

    // Rodapé / Assinaturas
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.line(40, finalY, 90, finalY);
    doc.text('Assinatura do Responsável', 45, finalY + 5);

    doc.line(120, finalY, 170, finalY);
    doc.text('Carimbo da Unidade', 130, finalY + 5);

    doc.save(`CAPA_${processo.numero}.pdf`);
}

/**
 * Gera o Protocolo de Entrega de Documentação
 */
export function gerarProtocoloEntrega(processo: ProcessoTFD) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(10);
    doc.text('DIRCA - TFD ACOMPANHA', 20, 15);
    doc.text(format(new Date(), "dd/MM/yyyy HH:mm"), pageWidth - 60, 15);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PROTOCOLO DE ENTREGA DE DOCUMENTAÇÃO', pageWidth / 2, 30, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const text = `Declaramos para os devidos fins que o(a) Sr(a) ${processo.paciente?.nome}, CPF ${processo.paciente?.cpf}, entregou nesta data a documentação referente ao processo ${processo.numero} para solicitação de Tratamento Fora de Domicílio na especialidade de ${processo.especialidade}.`;

    const splitText = doc.splitTextToSize(text, pageWidth - 40);
    doc.text(splitText, 20, 45);

    doc.text('Documentos conferidos:', 20, 70);
    doc.text('- Laudo Médico para TFD', 25, 78);
    doc.text('- Cópias de Documentos Pessoais (RG/CPF)', 25, 84);
    doc.text('- Comprovante de Residência', 25, 90);
    doc.text('- Cartão do SUS', 25, 96);
    doc.text('- Exames Complementares', 25, 102);

    doc.setFont('helvetica', 'bold');
    doc.text('IMPORTANTE:', 20, 115);
    doc.setFont('helvetica', 'normal');
    doc.text('O acompanhamento da situação do processo pode ser feito via portal:', 20, 122);
    doc.setTextColor(37, 99, 235);
    doc.text('http://tfd-acompanha.saude.am.gov.br/consulta', 20, 128);
    doc.setTextColor(0, 0, 0);

    const finalY = 160;
    doc.line(pageWidth / 2 - 40, finalY, pageWidth / 2 + 40, finalY);
    doc.text('Assinatura do Paciente / Responsável', pageWidth / 2, finalY + 5, { align: 'center' });

    doc.save(`PROTOCOLO_${processo.numero}.pdf`);
}
