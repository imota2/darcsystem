// ==========================================
// ESTADO DA APLICAÇÃO
// ==========================================
let contacts = JSON.parse(localStorage.getItem('darc_contacts_v1')) || JSON.parse(localStorage.getItem('nexus_contacts_v3')) || [
  {
    id: 'c_1',
    name: "Gabriel Vance",
    phone: "5511988887777",
    category: "Principais",
    note: "Verificar sincronização de diretrizes antes do procedimento de sexta-feira.",
    status: 'pendente',
    lastInteraction: null
  },
  {
    id: 'c_2',
    name: "Valentin Rostova",
    phone: "5513991234567",
    category: "Operacionais",
    note: "Ajuste e calibração de parâmetros agendados para o fim de semana.",
    status: 'pendente',
    lastInteraction: null
  }
];

let selectedIds = new Set();
let activeCategory = 'TODOS';
let confirmCallback = null;

// ==========================================
// ELEMENTOS DO DOM
// ==========================================
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const modalOverlay = document.getElementById('modalOverlay');
const contactForm = modalOverlay.querySelector('form');

const nameInput = contactForm.querySelectorAll('input')[0];
const phoneInput = document.getElementById('phoneModalInput');
const categorySelect = contactForm.querySelector('select');
const noteTextarea = contactForm.querySelector('textarea');

const searchInput = document.getElementById('searchInput');
const cardsContainer = document.getElementById('cardsGrid');
const categoryButtons = document.querySelectorAll('.filter-btn');

const bulkInputText = document.getElementById('bulkInputText');
const processBulkBtn = document.getElementById('processBulkBtn');

const selectedCountBadge = document.getElementById('selectedCountBadge');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');

const ocrImageInput = document.getElementById('ocrImageInput');
const ocrStatus = document.getElementById('ocrStatus');
const filterContainer = document.getElementById('filterContainer');
const toastContainer = document.getElementById('toastContainer');

const confirmOverlay = document.getElementById('confirmOverlay');
const confirmMessage = document.getElementById('confirmMessage');
const okConfirmBtn = document.getElementById('okConfirmBtn');
const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');

const toolsDropdownMenu = document.getElementById('toolsDropdownMenu');

// ==========================================
// SISTEMA DE ALERTAS (TOAST)
// ==========================================
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  
  let bgColors = "bg-zinc-900 border-yellow-500 text-yellow-300";
  if (type === 'success') bgColors = "bg-emerald-950 border-emerald-500 text-emerald-300";
  if (type === 'error') bgColors = "bg-red-950 border-red-500 text-red-300";

  toast.className = `toast px-4 py-3 rounded-xl border-2 font-bold text-xs shadow-2xl ${bgColors} flex items-center gap-2`;
  toast.innerHTML = `<span>[SYSTEM]</span> <span>${msg}</span>`;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// ==========================================
// MENU DROPDOWN DE FERRAMENTAS
// ==========================================
window.toggleToolsMenu = function() {
  if (toolsDropdownMenu) {
    toolsDropdownMenu.classList.toggle('hidden');
  }
};

// Fechar dropdown ao clicar fora
document.addEventListener('click', (e) => {
  const btn = document.getElementById('toolsDropdownBtn');
  if (toolsDropdownMenu && btn && !toolsDropdownMenu.contains(e.target) && !btn.contains(e.target)) {
    toolsDropdownMenu.classList.add('hidden');
  }
});

// ==========================================
// DASHBOARD E INDICADORES
// ==========================================
function updateDashboard() {
  const total = contacts.length;
  const sent = contacts.filter(c => c.status === 'enviado').length;
  const invalid = contacts.filter(c => c.status === 'invalid').length;
  const pending = total - sent - invalid;

  document.getElementById('dashTotal').innerText = total;
  document.getElementById('dashSent').innerText = sent;
  document.getElementById('dashPending').innerText = pending < 0 ? 0 : pending;
  document.getElementById('dashInvalid').innerText = invalid;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR');
  document.getElementById('lastSyncTime').innerText = timeStr;
}

// ==========================================
// MODAL DE CONFIRMAÇÃO CUSTOMIZADO
// ==========================================
function customConfirm(message, onConfirm) {
  confirmMessage.innerText = message;
  confirmCallback = onConfirm;
  confirmOverlay.classList.remove('hidden');
  confirmOverlay.classList.add('flex');
}

cancelConfirmBtn.addEventListener('click', () => {
  confirmOverlay.classList.add('hidden');
  confirmOverlay.classList.remove('flex');
  confirmCallback = null;
});

okConfirmBtn.addEventListener('click', () => {
  if (confirmCallback) confirmCallback();
  confirmOverlay.classList.add('hidden');
  confirmOverlay.classList.remove('flex');
  confirmCallback = null;
});

// ==========================================
// RECURSOS: COPIAR E COMPARTILHAR
// ==========================================
window.copyAllNumbers = function() {
  const visibleContacts = getFilteredContacts();
  
  if (visibleContacts.length === 0) {
    showToast("Nenhum registro selecionável para cópia.", "error");
    return;
  }

  const numbersList = visibleContacts.map(c => '+' + prepareWaNumber(c.phone)).join('\n');

  navigator.clipboard.writeText(numbersList).then(() => {
    showToast(`${visibleContacts.length} identificador(es) copiado(s) com êxito.`, "success");
  }).catch(() => {
    showToast("Erro ao tentar copiar os dados.", "error");
  });
};

window.shareContactsCSV = async function() {
  if (contacts.length === 0) {
    showToast("Sem dados para compartilhamento.", "error");
    return;
  }

  let csvLines = ["Nome;Telefone;Categoria;Anotacao;Status;UltimaInteracao"];

  contacts.forEach(c => {
    const name = `"${(c.name || '').replace(/"/g, '""')}"`;
    const rawPhone = c.phone || '';
    const phone = `="` + rawPhone + `"`;
    const category = `"${(c.category || '').replace(/"/g, '""')}"`;
    const note = `"${(c.note || '').replace(/"/g, '""')}"`;
    const status = `"${(c.status || '').replace(/"/g, '""')}"`;
    const lastInteraction = `"${(c.lastInteraction || 'Nunca').replace(/"/g, '""')}"`;

    csvLines.push(`${name};${phone};${category};${note};${status};${lastInteraction}`);
  });

  const csvString = "\uFEFF" + csvLines.join("\n");
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const file = new File([blob], `darc_system_relatorio_${new Date().toISOString().slice(0, 10)}.csv`, { type: 'text/csv' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "D'Arc System - Relatório de Protocolos",
        text: "Exportação oficial da lista de diretórios do D'Arc System."
      });
      showToast("Arquivo de dados transmitido com sucesso.", "success");
    } catch (err) {
      if (err.name !== 'AbortError') {
        showToast("Falha durante o envio da exportação.", "error");
      }
    }
  } else {
    showToast("Ambiente sem suporte ao compartilhamento direto. Iniciando download.", "info");
    exportContactsCSV();
  }
};

// ==========================================
// EXPORTAR E IMPORTAR (CSV & JSON)
// ==========================================
window.exportContactsCSV = function() {
  if (contacts.length === 0) {
    showToast("Sem dados disponíveis para exportação.", "error");
    return;
  }

  let csvLines = ["Nome;Telefone;Categoria;Anotacao;Status;UltimaInteracao"];

  contacts.forEach(c => {
    const name = `"${(c.name || '').replace(/"/g, '""')}"`;
    const rawPhone = c.phone || '';
    const phone = `="` + rawPhone + `"`;
    const category = `"${(c.category || '').replace(/"/g, '""')}"`;
    const note = `"${(c.note || '').replace(/"/g, '""')}"`;
    const status = `"${(c.status || '').replace(/"/g, '""')}"`;
    const lastInteraction = `"${(c.lastInteraction || 'Nunca').replace(/"/g, '""')}"`;

    csvLines.push(`${name};${phone};${category};${note};${status};${lastInteraction}`);
  });

  const csvString = "\uFEFF" + csvLines.join("\n");
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const downloadAnchor = document.createElement("a");
  downloadAnchor.href = url;
  downloadAnchor.setAttribute("download", `darc_system_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
  URL.revokeObjectURL(url);

  showToast("Planilha CSV gerada e baixada.", "success");
};

window.importContactsCSV = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const lines = text.split(/\r\n|\n/);

      if (lines.length < 2) {
        showToast("O arquivo CSV selecionado não possui entradas válidas.", "error");
        return;
      }

      const header = lines[0];
      const separator = header.includes(';') ? ';' : ',';

      const parseCSVLine = (line) => {
        const result = [];
        let start = 0;
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') inQuotes = !inQuotes;
          else if (line[i] === separator && !inQuotes) {
            let field = line.substring(start, i).trim();
            if (field.startsWith('"') && field.endsWith('"')) field = field.slice(1, -1).replace(/""/g, '"');
            result.push(field);
            start = i + 1;
          }
        }
        let lastField = line.substring(start).trim();
        if (lastField.startsWith('"') && lastField.endsWith('"')) lastField = lastField.slice(1, -1).replace(/""/g, '"');
        result.push(lastField);
        return result;
      };

      let addedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);
        if (cols.length >= 2) {
          const name = cols[0] || 'Registro CSV';
          const rawPhone = cols[1] || '';

          if (rawPhone) {
            const formattedPhone = prepareWaNumber(rawPhone);
            const alreadyExists = contacts.some(c => prepareWaNumber(c.phone) === formattedPhone);

            if (!alreadyExists) {
              contacts.unshift({
                id: 'csv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                name: name,
                phone: formattedPhone,
                category: cols[2] || 'Lotes',
                note: cols[3] || '',
                status: cols[4] || 'pendente',
                lastInteraction: cols[5] || null
              });
              addedCount++;
            }
          }
        }
      }

      saveToStorage();
      renderContacts();

      if (addedCount > 0) {
        showToast(`${addedCount} registro(s) importado(s) via CSV.`, "success");
      } else {
        showToast("Nenhum dado inédito localizado no CSV.", "info");
      }

    } catch (err) {
      showToast("Falha de leitura durante o processamento do CSV.", "error");
    } finally {
      event.target.value = '';
    }
  };

  reader.readAsText(file, 'UTF-8');
};

window.exportContactsJSON = function() {
  if (contacts.length === 0) {
    showToast("Sem registros disponíveis para o backup.", "error");
    return;
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(contacts, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `darc_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  showToast("Arquivo JSON de restauração gerado com sucesso.", "success");
};

window.importContactsJSON = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);

      if (!Array.isArray(importedData)) {
        throw new Error("Formato não suportado");
      }

      let addedCount = 0;
      importedData.forEach(item => {
        if (item.name && item.phone) {
          const formattedPhone = prepareWaNumber(item.phone);
          const alreadyExists = contacts.some(c => prepareWaNumber(c.phone) === formattedPhone);

          if (!alreadyExists) {
            contacts.unshift({
              id: item.id || 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
              name: item.name,
              phone: formattedPhone,
              category: item.category || 'Lotes',
              note: item.note || '',
              status: item.status || 'pendente',
              lastInteraction: item.lastInteraction || null
            });
            addedCount++;
          }
        }
      });

      saveToStorage();
      renderContacts();

      if (addedCount > 0) {
        showToast(`${addedCount} entrada(s) adicionada(s) via JSON.`, "success");
      } else {
        showToast("Nenhuma novidade encontrada no arquivo importado.", "info");
      }

    } catch (err) {
      showToast("Falha na interpretação da estrutura do arquivo JSON.", "error");
    } finally {
      event.target.value = '';
    }
  };

  reader.readAsText(file);
};

// ==========================================
// MÁSCARA AUTOMÁTICA DE TELEFONE
// ==========================================
if (phoneInput) {
  phoneInput.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);

    if (v.length > 10) {
      e.target.value = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    } else if (v.length > 6) {
      e.target.value = `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
    } else if (v.length > 2) {
      e.target.value = `(${v.slice(0,2)}) ${v.slice(2)}`;
    } else {
      e.target.value = v;
    }
  });
}

// ==========================================
// CONTROLE DO MODAL DE REGISTRO
// ==========================================
function openModal() {
  modalOverlay.classList.remove('hidden');
  modalOverlay.classList.add('flex');
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalOverlay.classList.remove('flex');
  contactForm.reset();
}

openModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// ==========================================
// TRATAMENTO E VALIDAÇÃO DE IDENTIFICADORES
// ==========================================
function cleanPhone(phone) {
  return phone.replace(/\D/g, '');
}

function prepareWaNumber(phone) {
  let clean = cleanPhone(phone);
  if (clean.length === 10 || clean.length === 11) {
    clean = '55' + clean;
  }
  return clean;
}

function formatPhoneDisplay(phone) {
  let clean = prepareWaNumber(phone);
  if (clean.length === 13) {
    return `+${clean.slice(0,2)} (${clean.slice(2,4)}) ${clean.slice(4,9)}-${clean.slice(9)}`;
  }
  return `+${clean}`;
}

// VALIDAÇÃO AVANÇADA (Sequências, Fictícios, DDD e Duplicados)
function validateBrPhone(phone, currentId = null) {
  let clean = cleanPhone(phone);
  if (clean.length >= 12 && clean.startsWith('55')) clean = clean.slice(2);

  // 1. Detectar Sequência Repetida (ex: 00000000000, 11111111111)
  if (/^(\d)\1+$/.test(clean)) {
    return { valid: false, reason: "Sequência Repetida Inválida" };
  }

  // 2. Detectar Números Fictícios Comuns
  if (clean === "12345678901" || clean === "01234567890") {
    return { valid: false, reason: "Padrão Numérico Fictício" };
  }

  // 3. Tabela de DDDs Válidos no Brasil
  const validDDDs = [
    11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,
    41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,
    71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99
  ];

  const ddd = parseInt(clean.slice(0, 2), 10);
  if (!validDDDs.includes(ddd)) return { valid: false, reason: "DDD Inexistente" };
  if (clean.length === 11 && clean[2] !== '9') return { valid: false, reason: "Sem 9º Dígito Móvel" };
  if (clean.length < 10 || clean.length > 11) return { valid: false, reason: "Comprimento Incompatível" };

  // 4. Checagem de Registros Duplicados na Base
  const formatted = prepareWaNumber(phone);
  const duplicateCount = contacts.filter(c => c.id !== currentId && prepareWaNumber(c.phone) === formatted).length;
  if (duplicateCount > 0) {
    return { valid: true, warning: `Duplicado na Base (${duplicateCount + 1}x)` };
  }

  return { valid: true };
}

function saveToStorage() {
  localStorage.setItem('darc_contacts_v1', JSON.stringify(contacts));
  updateDashboard();
}

// ==========================================
// GERENCIAMENTO DE SELEÇÃO
// ==========================================
window.toggleSelectCard = function(id) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }
  updateSelectionUI();
};

function updateSelectionUI() {
  const count = selectedIds.size;

  if (count > 0) {
    selectedCountBadge.innerText = `${count} selecionado(s)`;
    selectedCountBadge.classList.remove('hidden');
    deleteSelectedBtn.classList.remove('hidden');
    deleteSelectedBtn.classList.add('flex');
  } else {
    selectedCountBadge.classList.add('hidden');
    deleteSelectedBtn.classList.add('hidden');
    deleteSelectedBtn.classList.remove('flex');
  }

  contacts.forEach(c => {
    const cardEl = document.getElementById(`card_${c.id}`);
    const checkboxEl = document.getElementById(`chk_${c.id}`);

    if (cardEl && checkboxEl) {
      if (selectedIds.has(c.id)) {
        cardEl.classList.add('ring-2', 'ring-red-600');
        checkboxEl.checked = true;
      } else {
        cardEl.classList.remove('ring-2', 'ring-red-600');
        checkboxEl.checked = false;
      }
    }
  });
}

window.toggleSelectAll = function() {
  const visibleContacts = getFilteredContacts();
  const allVisibleSelected = visibleContacts.length > 0 && visibleContacts.every(c => selectedIds.has(c.id));

  if (allVisibleSelected) {
    visibleContacts.forEach(c => selectedIds.delete(c.id));
  } else {
    visibleContacts.forEach(c => selectedIds.add(c.id));
  }

  updateSelectionUI();
};

window.confirmDeleteSelected = function() {
  if (selectedIds.size === 0) return;

  customConfirm(`Remover definitivamente os ${selectedIds.size} itens marcados?`, () => {
    contacts = contacts.filter(c => !selectedIds.has(c.id));
    selectedIds.clear();
    saveToStorage();
    renderContacts();
    showToast("Entradas selecionadas removidas com sucesso.", "success");
  });
};

window.confirmDeleteAll = function() {
  if (contacts.length === 0) return;

  const isAll = activeCategory === 'TODOS';
  const msg = isAll 
    ? 'Deseja apagar TODOS os registros armazenados no sistema?' 
    : `Remover todos os itens pertencentes à categoria "${activeCategory}"?`;

  customConfirm(msg, () => {
    if (isAll) {
      contacts = [];
    } else {
      contacts = contacts.filter(c => c.category.toLowerCase() !== activeCategory.toLowerCase());
    }
    selectedIds.clear();
    saveToStorage();
    renderContacts();
    showToast("Diretório limpo com sucesso.", "success");
  });
};

window.markAsInvalid = function(id) {
  const item = contacts.find(c => c.id === id);
  if (item) {
    item.status = 'invalid';
    saveToStorage();
    renderContacts();
    showToast("Entrada classificada como inativa/sem acesso", "error");
  }
};

window.deleteContact = function(id) {
  customConfirm('Confirmar a exclusão deste item?', () => {
    contacts = contacts.filter(c => c.id !== id);
    selectedIds.delete(id);
    saveToStorage();
    renderContacts();
    showToast("Registro eliminado.", "success");
  });
};

// ==========================================
// PROCESSAMENTO EM LOTE
// ==========================================
processBulkBtn.addEventListener('click', () => {
  const text = bulkInputText.value;
  if (!text.trim()) return;

  const rawMatches = text.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}/g) || [];
  let cleanedNumbers = rawMatches.map(num => cleanPhone(num)).filter(num => num.length >= 10 && num.length <= 13);

  const lines = text.split(/[\n,;]+/);
  lines.forEach(line => {
    const digits = cleanPhone(line);
    if (digits.length >= 10 && digits.length <= 13 && !cleanedNumbers.includes(digits)) {
      cleanedNumbers.push(digits);
    }
  });

  cleanedNumbers = [...new Set(cleanedNumbers)];

  let addedCount = 0;
  cleanedNumbers.forEach((phone) => {
    const formatted = prepareWaNumber(phone);
    
    if (!contacts.some(c => prepareWaNumber(c.phone) === formatted)) {
      contacts.unshift({
        id: 'bulk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: `Entrada em Lote #${contacts.length + 1}`,
        phone: formatted,
        category: "Lotes",
        note: "",
        status: "pendente",
        lastInteraction: null
      });
      addedCount++;
    }
  });

  saveToStorage();
  renderContacts();
  bulkInputText.value = '';

  if (addedCount > 0) {
    showToast(`${addedCount} novo(s) número(s) catalogado(s).`, 'success');
  } else {
    showToast("Nenhum dado inédito identificado no texto inserido.", 'error');
  }
});

// ==========================================
// RENDERIZAÇÃO DA INTERFACE
// ==========================================
function getFilteredContacts() {
  const searchTerm = searchInput.value.toLowerCase();
  return contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm) ||
                          contact.phone.includes(searchTerm) ||
                          contact.note.toLowerCase().includes(searchTerm);

    const matchesCategory = activeCategory === 'TODOS' || 
                            contact.category.toLowerCase() === activeCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });
}

function renderContacts() {
  const filtered = getFilteredContacts();
  cardsContainer.innerHTML = '';

  updateDashboard();

  if (filtered.length === 0) {
    cardsContainer.innerHTML = `
      <div class="col-span-full text-center py-12 space-y-3">
        <p class="text-zinc-500 font-bold uppercase text-xs tracking-widest">Nenhum registro localizado no banco de dados.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(contact => {
    const cleanNum = prepareWaNumber(contact.phone);
    const waLink = `https://wa.me/${cleanNum}`;
    const isSent = contact.status === 'enviado';
    const isInvalid = contact.status === 'invalid';
    const isSelected = selectedIds.has(contact.id);

    const phoneCheck = validateBrPhone(contact.phone, contact.id);

    let badgeStyle = "bg-zinc-900 text-red-400 border-red-900/60";

    if (contact.category === 'Operacionais') {
      badgeStyle = "bg-zinc-900 text-amber-400 border-amber-900/60";
    } else if (contact.category === 'Reservados') {
      badgeStyle = "bg-zinc-900 text-zinc-300 border-zinc-700";
    } else if (contact.category === 'Lotes') {
      badgeStyle = "bg-zinc-900 text-red-400 border-red-800";
    }

    const card = document.createElement('div');
    card.id = `card_${contact.id}`;
    card.className = `se-card-glow rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-4 relative ${isSent ? 'opacity-60 border-red-950' : ''} ${isInvalid ? 'border-red-600 bg-red-950/20' : ''} ${isSelected ? 'ring-2 ring-red-600' : ''}`;
    
    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-2 mb-3">
          <div class="flex items-center gap-2">
            <input type="checkbox" id="chk_${contact.id}" onchange="toggleSelectCard('${contact.id}')" ${isSelected ? 'checked' : ''} class="w-4 h-4 accent-red-600 cursor-pointer rounded">
            
            <span class="${badgeStyle} border text-[10px] font-bold px-3 py-1 rounded-full uppercase">
              ${contact.category}
            </span>
          </div>

          <button onclick="deleteContact('${contact.id}')" class="text-zinc-600 hover:text-red-500 text-xs font-bold transition" title="Excluir entrada">
            REMOVER
          </button>
        </div>
        
        <h3 class="font-bold text-zinc-100 text-lg sm:text-xl tracking-wide">${contact.name}</h3>
        <p class="text-xs text-red-400 font-mono font-bold mt-1">${formatPhoneDisplay(contact.phone)}</p>
        
        <!-- ALERTAS DE VALIDAÇÃO E DUPLICIDADE -->
        ${!phoneCheck.valid ? `
          <div class="mt-2 text-[10px] text-red-400 bg-red-950/40 border border-red-900/60 p-1.5 rounded-lg font-bold flex items-center gap-1">
            ⚠ ALERTA: ${phoneCheck.reason}
          </div>
        ` : ''}

        ${phoneCheck.valid && phoneCheck.warning ? `
          <div class="mt-2 text-[10px] text-amber-400 bg-amber-950/30 border border-amber-900/50 p-1.5 rounded-lg font-bold flex items-center gap-1">
            ⚡ ATENÇÃO: ${phoneCheck.warning}
          </div>
        ` : ''}

        ${contact.note ? `
          <p class="text-xs text-zinc-300 bg-black/60 p-3 sm:p-3.5 rounded-xl border border-zinc-800/80 mt-3 sm:mt-4 leading-relaxed font-sans">
            "${contact.note}"
          </p>
        ` : ''}

        <div class="mt-3 flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <span class="text-[9px] uppercase tracking-widest font-bold ${isInvalid ? 'text-red-500' : isSent ? 'text-emerald-400' : 'text-zinc-500'}">
              ${isInvalid ? 'INATIVO / SEM RESPOSTA' : isSent ? 'MENSAGEM ENVIADA' : 'PENDENTE'}
            </span>

            ${!isInvalid ? `
              <button onclick="markAsInvalid('${contact.id}')" class="text-[10px] text-zinc-500 hover:text-red-400 underline">
                Marcar Inativo
              </button>
            ` : ''}
          </div>

          ${contact.lastInteraction ? `
            <span class="text-[9px] font-mono text-zinc-500">Última interação: ${contact.lastInteraction}</span>
          ` : ''}
        </div>
      </div>

      <div class="flex items-center gap-2 sm:gap-3 pt-2 border-t border-zinc-800/80">
        <button onclick="copyToClipboard('+${cleanNum}', this)" class="se-btn-secondary px-3 py-2.5 rounded-lg text-xs active:scale-95 flex-shrink-0">
          COPIAR
        </button>
        
        <a href="${waLink}" target="_blank" onclick="markAsSent('${contact.id}')" class="flex-1 se-btn-main py-2.5 rounded-lg text-xs flex items-center justify-center gap-1 active:scale-95 font-bold uppercase tracking-wider">
          INICIAR COMUNICAÇÃO
        </a>
      </div>
    `;

    cardsContainer.appendChild(card);
  });

  updateSelectionUI();
}

// ==========================================
// AÇÕES DIRETA DOS CARDS
// ==========================================
window.markAsSent = function(id) {
  const item = contacts.find(c => c.id === id);
  if (item) {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} ${now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`;
    
    item.status = 'enviado';
    item.lastInteraction = formattedDate;
    
    saveToStorage();
    renderContacts();
    showToast("Comunicação registrada no protocolo.", "success");
  }
};

window.copyToClipboard = function(text, btnElement) {
  navigator.clipboard.writeText(text).then(() => {
    showToast("Valor copiado para a área de transferência.", "success");
    const originalText = btnElement.innerText;
    btnElement.innerText = 'COPIADO';
    setTimeout(() => {
      btnElement.innerText = originalText;
    }, 1500);
  });
};

// ==========================================
// MANIPULAÇÃO DE FORMULÁRIOS E FILTROS
// ==========================================
contactForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const category = categorySelect.value;
  const note = noteTextarea.value.trim();

  if (!name || !phone) {
    showToast("Os campos Nome e Telefone são obrigatórios.", "error");
    return;
  }

  contacts.unshift({
    id: 'c_' + Date.now(),
    name,
    phone,
    category,
    note,
    status: 'pendente',
    lastInteraction: null
  });

  saveToStorage();
  renderContacts();
  closeModal();
  showToast("Novo registro armazenado.", "success");
});

// Pesquisa
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(renderContacts, 150);
});

categoryButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    categoryButtons.forEach(b => {
      b.className = 'filter-btn se-btn-secondary px-3.5 py-1.5 text-[11px] rounded-lg flex items-center gap-1.5 whitespace-nowrap';
    });

    btn.className = 'filter-btn se-btn-main px-3.5 py-1.5 text-[11px] rounded-lg flex items-center gap-1.5 whitespace-nowrap';
    activeCategory = btn.getAttribute('data-category');

    renderContacts();
  });
});

// Drag em Scroll Horizontal
if (filterContainer) {
  let isDown = false;
  let startX;
  let scrollLeft;
  let hasDragged = false;

  filterContainer.addEventListener('mousedown', (e) => {
    isDown = true;
    hasDragged = false;
    filterContainer.classList.add('active');
    startX = e.pageX - filterContainer.offsetLeft;
    scrollLeft = filterContainer.scrollLeft;
  });

  filterContainer.addEventListener('mouseleave', () => {
    isDown = false;
    filterContainer.classList.remove('active');
  });

  filterContainer.addEventListener('mouseup', () => {
    isDown = false;
    filterContainer.classList.remove('active');
  });

  filterContainer.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - filterContainer.offsetLeft;
    const walk = (x - startX) * 1.8;
    
    if (Math.abs(walk) > 5) hasDragged = true;
    filterContainer.scrollLeft = scrollLeft - walk;
  });

  filterContainer.addEventListener('click', (e) => {
    if (hasDragged) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
}

// ==========================================
// PROCESSAMENTO OCR (IMAGEM)
// ==========================================
if (ocrImageInput) {
  ocrImageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    ocrStatus.classList.remove('hidden');
    ocrStatus.innerText = "Digitalizando documento visual...";

    try {
      const result = await Tesseract.recognize(file, 'por+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(m.progress * 100);
            ocrStatus.innerText = `Analisando documento: ${pct}%...`;
          }
        }
      });

      const extractedText = result.data.text;

      if (extractedText.trim()) {
        bulkInputText.value = bulkInputText.value ? bulkInputText.value + '\n' + extractedText : extractedText;
        showToast("Texto do documento extraído com sucesso.", "success");
      } else {
        showToast("Nenhum dado numérico legível encontrado na imagem.", "error");
      }

    } catch (error) {
      showToast("Falha durante o escaneamento da imagem.", "error");
    } finally {
      ocrStatus.classList.add('hidden');
      ocrImageInput.value = '';
    }
  });
}

renderContacts();