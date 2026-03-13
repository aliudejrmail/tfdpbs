import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ProcessoTFD } from '../types';
import { LOGO_BASE64 } from './logo';

/**
 * Gera a Capa do Processo TFD
 */
export function gerarCapaProcesso(processo: ProcessoTFD) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Adicionar logotipo (Otimizado para máxima fidelidade e nitidez)
    try {
        // 'FAST' ou 'NONE' na compressão garante que o jsPDF não degrade a imagem Base64
        doc.addImage(LOGO_BASE64, 'PNG', pageWidth / 2 - 12, 10, 24, 0, undefined, 'FAST');
    } catch (err) {
        console.error('Erro ao carregar logotipo:', err);
    }

    // Cabeçalho (Aproximado do logo)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PREFEITURA MUNICIPAL DE PARAUAPEBAS', pageWidth / 2, 45, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('SECRETARIA MUNICIPAL DE SAÚDE', pageWidth / 2, 50, { align: 'center' });
    doc.text('DIRETORIA DE REGULAÇÃO CONTROLE E AVALIAÇÃO', pageWidth / 2, 55, { align: 'center' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CAPA DE PROCESSO TFD', pageWidth / 2, 75, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(20, 80, pageWidth - 20, 80);

    // Número do Processo (Destaque)
    doc.setFontSize(24);
    doc.text(processo.numero, pageWidth / 2, 95, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data de Abertura: ${format(new Date(processo.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, pageWidth / 2, 103, { align: 'center' });

    // Tabela de Dados do Paciente
    autoTable(doc, {
        startY: 115,
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
        startY: (doc as any).lastAutoTable.finalY + 15,
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
        startY: (doc as any).lastAutoTable.finalY + 15,
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
    const finalY = (doc as any).lastAutoTable.finalY + 40;
    doc.line(40, finalY, 90, finalY);
    doc.text('Assinatura do Responsável', 45, finalY + 5);

    doc.line(120, finalY, 170, finalY);
    doc.text('Carimbo da Unidade', 130, finalY + 5);

    // Exibir PDF no navegador em vez de baixar
    const pdfData = doc.output('bloburl');
    window.open(pdfData, '_blank');
}

/**
 * Gera o Protocolo de Entrega de Documentação
 */
export function gerarProtocoloEntrega(processo: ProcessoTFD) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Adicionar logotipo (Otimizado para máxima fidelidade e nitidez)
    try {
        // 'FAST' ou 'NONE' na compressão garante que o jsPDF não degrade a imagem Base64
        doc.addImage(LOGO_BASE64, 'PNG', pageWidth / 2 - 12, 10, 24, 0, undefined, 'FAST');
    } catch (err) {
        console.error('Erro ao carregar logotipo:', err);
    }

    // Cabeçalho (Aproximado do logo)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PREFEITURA MUNICIPAL DE PARAUAPEBAS', pageWidth / 2, 45, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('SECRETARIA MUNICIPAL DE SAÚDE', pageWidth / 2, 50, { align: 'center' });
    doc.text('DIRETORIA DE REGULAÇÃO CONTROLE E AVALIAÇÃO', pageWidth / 2, 55, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(20, 68, pageWidth - 20, 68);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PROTOCOLO DE ENTREGA DE DOCUMENTAÇÃO', pageWidth / 2, 80, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const text = `Declaramos para os devidos fins que o(a) Sr(a) ${processo.paciente?.nome}, CPF ${processo.paciente?.cpf}, entregou nesta data a documentação referente ao processo ${processo.numero} para solicitação de Tratamento Fora de Domicílio na especialidade de ${processo.especialidade}.`;

    const splitText = doc.splitTextToSize(text, pageWidth - 40);
    doc.text(splitText, 20, 95);

    doc.text('Documentos conferidos:', 20, 110);
    doc.text('- Laudo Médico para TFD', 25, 118);
    doc.text('- Cópias de Documentos Pessoais (RG/CPF)', 25, 124);
    doc.text('- Comprovante de Residência', 25, 130);
    doc.text('- Cartão do SUS', 25, 136);
    doc.text('- Exames Complementares', 25, 142);

    doc.setFont('helvetica', 'bold');
    doc.text('IMPORTANTE:', 20, 155);
    doc.setFont('helvetica', 'normal');
    doc.text('O acompanhamento da situação do processo pode ser feito via portal da SEMSA.', 20, 162);
    doc.setTextColor(0, 0, 0);

    const finalY = 200;
    doc.line(pageWidth / 2 - 40, finalY, pageWidth / 2 + 40, finalY);
    doc.text('Assinatura do Paciente / Responsável', pageWidth / 2, finalY + 5, { align: 'center' });

    // Exibir PDF no navegador em vez de baixar
    const pdfData = doc.output('bloburl');
    window.open(pdfData, '_blank');
}
