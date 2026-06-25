// ============================================================
//  FLUJO POR DEFECTO (Fallback integrado)
// ============================================================
const defaultFlow = {
    steps: [
        // PASO 1
        {
            id: 1,
            phase: 'fraude',
            title: 'Validación 1: Estado de la Orden',
            badge: 'Desk Review',
            action: 'Ingresa a +Simple y valida el estado de la(s) orden(es)',
            speech: '🔍 Abre +Simple y busca el RUC del cliente.\n\n📋 Revisa el estado de la(s) orden(es):\n• ¿Está CANCELADA?\n• ¿Está TERMINADA?\n\n⚠️ Si está CANCELADA o TERMINADA, continúa.',
            decisions: [
                { id: 'cancelado', label: '📦 Estado: CANCELADO', type: 'info', nextStep: 2 },
                { id: 'terminado', label: '✅ Estado: TERMINADO', type: 'info', nextStep: 2 }
            ]
        },
        // PASO 2
        {
            id: 2,
            phase: 'fraude',
            title: 'Validación 2: Consultar RUC en Visor B2B',
            badge: 'Desk Review',
            action: 'Abre el Visor B2B y consulta el RUC de la alerta',
            speech: '🔍 Abre Visor B2B y busca el RUC.\n\n✅ Obtén información de la empresa y contactos autorizados:\n• RRLL, RRAA, Gerente General\n\n⚠️ Valida que exista un correo válido.',
            decisions: [
                { id: 'hay_info', label: '✅ Hay información y teléfono', type: 'success', nextStep: 3 },
                { id: 'no_info', label: '❌ No hay información', type: 'danger', nextStep: 4 }
            ]
        },
        // PASO 3
        {
            id: 3,
            phase: 'fraude',
            title: 'Validación: Comparar Teléfonos',
            badge: 'Desk Review',
            action: 'Compara el teléfono de Haross con el teléfono del Visor B2B',
            speech: '📞 Compara ambos números:\n• ¿Son IGUALES?\n• ¿Son DIFERENTES?\n\n📌 Luego ve a "Checa tu Línea".',
            decisions: [
                { id: 'igual', label: '✅ Son IGUALES', type: 'success', nextStep: 5 },
                { id: 'diferente', label: '❌ Son DIFERENTES', type: 'warning', nextStep: 5 }
            ]
        },
        // PASO 4
        {
            id: 4,
            phase: 'fraude',
            title: 'Validación 3: Consultar RUC en Web SUNAT',
            badge: 'Desk Review',
            action: 'Abre la Web de SUNAT y consulta el RUC de la empresa',
            speech: '🌐 Abre SUNAT.\n\n✅ Verifica:\n1. Estado: ¿ACTIVO?\n2. Condición: ¿HABIDO?\n\n⚠️ Si NO es ACTIVO o NO es HABIDO → Fraude.',
            decisions: [
                { id: 'activo_habido', label: '✅ ACTIVO y HABIDO', type: 'success', nextStep: 6 },
                { id: 'no_activo', label: '❌ No ACTIVO', type: 'danger', nextStep: 7 },
                { id: 'no_habido', label: '❌ No HABIDO', type: 'danger', nextStep: 7 }
            ]
        },
        // PASO 5
        {
            id: 5,
            phase: 'fraude',
            title: 'Validación 5: Checa tu Línea',
            badge: 'Desk Review',
            action: 'Ingresa a Checa tu Línea y valida la pertenencia del teléfono',
            speech: '🔍 Abre Checa tu Línea.\n\n📋 Ingresa el RUC/Nro Documento del RRLL.\n\n✅ Valida si el número pertenece a:\n• La empresa\n• El RRLL\n• El RRAA\n• El GG',
            decisions: [
                { id: 'pertenece', label: '✅ El teléfono PERTENECE', type: 'success', nextStep: 8 },
                { id: 'no_pertenece', label: '❌ NO PERTENECE', type: 'warning', nextStep: 9 }
            ]
        },
        // PASO 6
        {
            id: 6,
            phase: 'fraude',
            title: 'Validación 4: Comparar con SUNAT',
            badge: 'Desk Review',
            action: 'Compara el nombre del usuario con el RRLL en SUNAT',
            speech: '📋 De SUNAT, obtén el nombre del RRLL.\n\n🔍 Compara con el nombre brindado por el usuario.\n\n✅ ¿Coincide?',
            decisions: [
                { id: 'coincide', label: '✅ El nombre COINCIDE', type: 'success', nextStep: 5 },
                { id: 'no_coincide', label: '❌ NO COINCIDE', type: 'danger', nextStep: 7 }
            ]
        },
        // PASO 7 - CIERRE FRAUDE
        {
            id: 7,
            phase: 'cierre',
            title: 'CIERRE: Fraude por Suplantación',
            badge: 'Cierre',
            action: 'Cancelar el pedido y registrar el cierre',
            speech: '🔴 TIPO DE CIERRE: Fraude por Suplantación\n❌ ¿CANCELAR?: Sí\n📝 CONTACTABILIDAD: No',
            decisions: [
                { id: 'cerrar', label: '🏁 Aplicar Cierre', type: 'closure', nextStep: null }
            ],
            isClosure: true,
            defaultClosure: { result: 'fraude-suplantacion', action: 'cancelar' }
        },
        // PASO 8 - CIERRE FALSO POSITIVO
        {
            id: 8,
            phase: 'cierre',
            title: 'CIERRE: Falso Positivo',
            badge: 'Cierre',
            action: 'No cancelar el pedido. Continuar con la gestión.',
            speech: '✅ TIPO DE CIERRE: Falso Positivo\n✅ ¿CANCELAR?: No\n📝 CONTACTABILIDAD: Sí',
            decisions: [
                { id: 'cerrar', label: '🏁 Aplicar Cierre', type: 'closure', nextStep: null }
            ],
            isClosure: true,
            defaultClosure: { result: 'falso-positivo', action: 'no-cancelar' }
        },
        // PASO 9 - CONTACTO INICIAL
        {
            id: 9,
            phase: 'contacto',
            title: 'Contacto con el Cliente - Speech Inicial',
            badge: 'Llamada',
            action: 'Aplica el speech de bienvenida e identifica titularidad',
            speech: '📞 "Perfecto, Sr(a). [Nombre], nos comunicamos para validar una solicitud de [cantidad] servicio(s) de tipo(s) [internet, dúo, trío, Fibra Empresarial] a nombre de la empresa [Nombre] para la(s) dirección(es) [Dirección].\n\n¿Me confirma que solicitó estos servicios?"',
            decisions: [
                { id: 'si_soy', label: '✅ "Sí, soy yo"', type: 'success', nextStep: 10 },
                { id: 'si_menos', label: '✅ "Sí, pero solicité menos"', type: 'warning', nextStep: 11 },
                { id: 'no_solicite', label: '❌ "No solicité nada"', type: 'danger', nextStep: 12 },
                { id: 'no_responsable', label: '⚠️ "No soy responsable"', type: 'warning', nextStep: 4 },
                { id: 'no_trabajo', label: '❌ "No trabajo allí"', type: 'danger', nextStep: 13 },
                { id: 'no_puedo', label: '⚠️ "No puedo responder ahora"', type: 'warning', nextStep: 14 },
                { id: 'no_soy', label: '❌ "No, no soy"', type: 'danger', nextStep: 15 },
                { id: 'conozco', label: 'ℹ️ "Conozco al responsable"', type: 'info', nextStep: 16 }
            ]
        },
        // PASO 10
        {
            id: 10,
            phase: 'contacto',
            title: 'Validación No Biométrica - VISOR B2C',
            badge: 'Llamada',
            action: 'El cliente confirmó ser el titular. Aplica validación no biométrica.',
            speech: '📞 "Perfecto, gracias. Para continuar, necesito que me brinde los últimos dígitos de su documento y su nombre completo."\n\n🔍 Verifica en VISOR B2C.',
            decisions: [
                { id: 'coincide', label: '✅ Datos COINCIDEN', type: 'success', nextStep: 8 },
                { id: 'no_coincide', label: '❌ NO COINCIDEN', type: 'danger', nextStep: 7 }
            ]
        },
        // PASO 11
        {
            id: 11,
            phase: 'contacto',
            title: 'Cliente solicita menos servicios',
            badge: 'Llamada',
            action: 'El cliente dice que solicitó menos servicios. Pregunta cuáles no reconoce.',
            speech: '📞 "Entiendo, ¿qué solicitud(es) no reconoce para cancelarlas?"\n\n📝 Anota en observaciones.',
            decisions: [
                { id: 'valida', label: '✅ Continuar validación', type: 'info', nextStep: 10 }
            ]
        },
        // PASO 12
        {
            id: 12,
            phase: 'cierre',
            title: 'CIERRE: Fraude por Suscripción',
            badge: 'Cierre',
            action: 'Cancelar el pedido. El cliente dice que no solicitó nada.',
            speech: '🔴 Fraude por Suscripción\n❌ Cancelar: Sí\n📝 Contactabilidad: Sí',
            decisions: [
                { id: 'cerrar', label: '🏁 Aplicar Cierre', type: 'closure', nextStep: null }
            ],
            isClosure: true,
            defaultClosure: { result: 'fraude-suscripcion', action: 'cancelar' }
        },
        // PASO 13
        {
            id: 13,
            phase: 'cierre',
            title: 'CIERRE: Fraude por Suplantación',
            badge: 'Cierre',
            action: 'Cancelar el pedido. El cliente no trabaja en la empresa.',
            speech: '🔴 Fraude por Suplantación\n❌ Cancelar: Sí\n📝 Contactabilidad: Sí',
            decisions: [
                { id: 'cerrar', label: '🏁 Aplicar Cierre', type: 'closure', nextStep: null }
            ],
            isClosure: true,
            defaultClosure: { result: 'fraude-suplantacion', action: 'cancelar' }
        },
        // PASO 14
        {
            id: 14,
            phase: 'contacto',
            title: 'Cliente no puede responder ahora',
            badge: 'Llamada',
            action: 'El cliente dice ser el titular pero no puede responder.',
            speech: '📞 "Entiendo, solo queremos validar los servicios."',
            decisions: [
                { id: 'continua', label: '✅ Acepta continuar', type: 'success', nextStep: 10 },
                { id: 'corta', label: '❌ Corta llamada', type: 'danger', nextStep: 17 }
            ]
        },
        // PASO 15
        {
            id: 15,
            phase: 'fraude',
            title: 'Cliente dice "No, no soy"',
            badge: 'Desk Review',
            action: 'El cliente niega ser el titular. Ir a validación con SUNAT.',
            speech: '📞 "Entiendo, disculpe. Gracias por su tiempo."\n\n🔍 Ve a SUNAT.',
            decisions: [
                { id: 'validar', label: '🔍 Ir a SUNAT', type: 'info', nextStep: 4 }
            ]
        },
        // PASO 16
        {
            id: 16,
            phase: 'contacto',
            title: 'Tercero conoce al responsable',
            badge: 'Llamada',
            action: 'El cliente dice no ser el titular pero conoce al responsable.',
            speech: '📞 "Entiendo, ¿me puede dar el nombre y teléfono del responsable?"\n\n📝 Anota en observaciones.',
            decisions: [
                { id: 'brinda_info', label: '✅ Brinda información', type: 'success', nextStep: 18 },
                { id: 'no_brinda', label: '❌ No brinda info', type: 'danger', nextStep: 17 }
            ]
        },
        // PASO 17
        {
            id: 17,
            phase: 'cierre',
            title: 'CIERRE: Posible Fraude',
            badge: 'Cierre',
            action: 'No cancelar. Dejar para otro intento.',
            speech: '🟡 Posible Fraude\n✅ Cancelar: No\n📝 Contactabilidad: No',
            decisions: [
                { id: 'cerrar', label: '🏁 Aplicar Cierre', type: 'closure', nextStep: null }
            ],
            isClosure: true,
            defaultClosure: { result: 'posible-fraude', action: 'no-cancelar' }
        },
        // PASO 18
        {
            id: 18,
            phase: 'contacto',
            title: 'Validación de Tercero Informado',
            badge: 'Llamada',
            action: 'Valida el nombre en SUNAT y el teléfono en Checa tu Línea',
            speech: '🔍 Valida nombre en SUNAT y teléfono en Checa tu Línea.',
            decisions: [
                { id: 'ambos_coinciden', label: '✅ Ambos COINCIDEN', type: 'success', nextStep: 8 },
                { id: 'no_coinciden', label: '❌ NO COINCIDEN', type: 'danger', nextStep: 7 }
            ]
        },
        // PASO 19
        {
            id: 19,
            phase: 'gestion',
            title: 'Validación de Servicio en Planta',
            badge: 'Gestión AxB',
            action: 'Aplica el speech de validación de servicio residencial',
            speech: '📞 "Hemos verificado que ya cuenta con un servicio residencial en la dirección..."',
            decisions: [
                { id: 'reconoce', label: '✅ Sí, lo reconozco', type: 'success', nextStep: 20 },
                { id: 'no_reconoce', label: '❌ No lo reconozco', type: 'warning', nextStep: 20 }
            ]
        },
        // PASO 20
        {
            id: 20,
            phase: 'gestion',
            title: 'Gestión AxB - Cuestionario',
            badge: 'Gestión AxB',
            action: 'Aplica el cuestionario de gestión AxB (Pregunta 1, 2 y 3)',
            speech: '📝 Pregunta 1: ¿Se dará de baja?\n📝 Pregunta 2: ¿Confirma perder beneficios?\n📝 Pregunta 3: ¿Confirma pagar dos servicios?',
            decisions: [
                { id: 'mantener', label: '✅ Mantendrá ambos', type: 'success', nextStep: 21 },
                { id: 'solo_b2c', label: '❌ Solo B2C', type: 'warning', nextStep: 21 },
                { id: 'solo_b2b', label: 'ℹ️ Solo B2B', type: 'info', nextStep: 21 }
            ]
        },
        // PASO 21
        {
            id: 21,
            phase: 'cierre',
            title: 'CIERRE: Gestión AxB Completada',
            badge: 'Cierre',
            action: 'Completa la gestión y registra el cierre',
            speech: '✅ Gestión AxB completada.\n📋 Resumen: Titularidad confirmada, Servicio validado, Cuestionario aplicado.',
            decisions: [
                { id: 'cerrar', label: '🏁 Aplicar Cierre', type: 'closure', nextStep: null }
            ],
            isClosure: true,
            defaultClosure: { result: 'axb', action: 'no-cancelar' }
        }
    ]
};

// ============================================================
//  ESTADO DE LA APLICACIÓN
// ============================================================
let flowData = { steps: [] };
let currentStepId = 1;
let history = [];
let startTime = Date.now();
let timerInterval = null;
let isClosed = false;
let isConnected = false;

// ============================================================
//  ELEMENTOS DOM
// ============================================================
const stepCard = document.getElementById('stepCard');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingSubMsg = document.getElementById('loadingSubMsg');
const currentPhaseLabel = document.getElementById('currentPhaseLabel');
const phaseStatus = document.getElementById('phaseStatus');
const completedCount = document.getElementById('completedCount');
const pathLength = document.getElementById('pathLength');
const elapsedTime = document.getElementById('elapsedTime');
const progressArc = document.getElementById('progressArc');
const progressPercent = document.getElementById('progressPercent');
const sessionTime = document.getElementById('sessionTime');
const pathHistory = document.getElementById('pathHistory');
const lastAction = document.getElementById('lastAction');
const statusBadge = document.getElementById('statusBadge');
const sourceBadge = document.getElementById('sourceBadge');
const apiUrl = document.getElementById('apiUrl');
const btnConnect = document.getElementById('btnConnect');
const btnUseDefault = document.getElementById('btnUseDefault');
const btnPrevious = document.getElementById('btnPrevious');
const btnReset = document.getElementById('btnReset');
const btnSaveProgress = document.getElementById('btnSaveProgress');
const btnExport = document.getElementById('btnExport');
const closureResult = document.getElementById('closureResult');
const closureAction = document.getElementById('closureAction');
const applyClosure = document.getElementById('applyClosure');
const toast = document.getElementById('toast');

// ============================================================
//  FUNCIONES PRINCIPALES
// ============================================================

function getStep(id) {
    return flowData.steps.find(s => s.id === id);
}

function getTotalSteps() {
    return flowData.steps.length;
}

function getPhaseOrder(phase) {
    const map = { 'fraude': 0, 'contacto': 1, 'gestion': 2, 'cierre': 3 };
    return map[phase] ?? 99;
}

function showToast(message, type = 'info') {
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

function copySpeech(text) {
    const plainText = text.replace(/\n/g, '\n');
    navigator.clipboard.writeText(plainText).then(() => {
        showToast('📋 Speech copiado', 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = plainText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('📋 Speech copiado', 'success');
    });
}

function updateProgress() {
    const total = getTotalSteps();
    const uniqueSteps = new Set(history);
    const completed = uniqueSteps.size;
    const step = getStep(currentStepId);

    let percentage = Math.min(Math.round((completed / total) * 100), 95);
    if (step?.isClosure) percentage = 100;

    progressArc.style.strokeDasharray = `${percentage}, 100`;
    progressPercent.textContent = `${percentage}%`;
    completedCount.textContent = completed;
    pathLength.textContent = history.length;

    // Fases
    const phases = document.querySelectorAll('.phase');
    const currentOrder = getPhaseOrder(step?.phase || 'fraude');
    phases.forEach(el => {
        el.classList.remove('active', 'completed');
        const p = el.dataset.phase;
        const order = getPhaseOrder(p);
        if (p === step?.phase) el.classList.add('active');
        else if (order < currentOrder) el.classList.add('completed');
    });

    // Fase actual
    if (step) {
        const phaseLabels = { 'fraude': '🔍 Desk Review', 'contacto': '📞 Contacto', 'gestion': '📋 Gestión AxB',
            'cierre': '🏁 Cierre' };
        currentPhaseLabel.textContent = phaseLabels[step.phase] || step.phase;
        phaseStatus.textContent = step.isClosure ? '✅ Completado' : '· En curso';
        phaseStatus.style.color = step.isClosure ? '#34a853' : '#1a73e8';
    }

    renderPathHistory();
}

function renderPathHistory() {
    let html = '';
    const uniqueHistory = [];
    const seen = new Set();
    for (const id of history) {
        if (!seen.has(id)) { seen.add(id);
            uniqueHistory.push(id); }
    }
    const displayHistory = uniqueHistory.slice(-10);
    if (displayHistory.length === 0) {
        html = '<div class="empty-message">Aún no hay pasos registrados</div>';
    } else {
        displayHistory.forEach((id) => {
            const step = getStep(id);
            if (!step) return;
            const isCurrent = id === currentStepId;
            const isClosure = step.isClosure;
            html += `
                <div class="path-item">
                    <span class="step-num ${isCurrent ? 'current' : (isClosure ? 'closure' : '')}">${id}</span>
                    <span class="step-name">${step.title.substring(0, 30)}${step.title.length > 30 ? '...' : ''}</span>
                    <span class="step-status ${isCurrent ? 'current' : (isClosure ? 'done' : '')}">
                        ${isCurrent ? '← Actual' : (isClosure ? '✅' : '')}
                    </span>
                </div>
            `;
        });
    }
    pathHistory.innerHTML = html;
    pathHistory.scrollTop = pathHistory.scrollHeight;
}

// ============================================================
//  RENDERIZAR PASO
// ============================================================

function renderStep(stepId) {
    const step = getStep(stepId);
    if (!step) {
        showToast('⚠️ Paso no encontrado', 'error');
        return;
    }

    if (history.length === 0 || history[history.length - 1] !== stepId) {
        history.push(stepId);
    }

    currentStepId = stepId;
    isClosed = step.isClosure || false;
    updateProgress();

    btnPrevious.disabled = history.length <= 1;

    let html = `
        <div class="step-header">
            <div>
                <h2 class="step-title">${step.title}</h2>
                <span class="step-badge badge-${step.phase}">
                    <i class="fas ${step.phase === 'fraude' ? 'fa-shield-alt' : step.phase === 'contacto' ? 'fa-phone' : step.phase === 'gestion' ? 'fa-clipboard-list' : 'fa-flag-checkered'}"></i>
                    ${step.badge}
                </span>
            </div>
            <span class="step-number">Paso ${step.id}</span>
        </div>
    `;

    html += `
        <div class="step-action">
            <div class="label"><i class="fas fa-tasks"></i> ACCIÓN REQUERIDA</div>
            <div class="text">${step.action}</div>
        </div>
    `;

    if (step.speech) {
        const speechText = step.speech.replace(/\n/g, '<br>');
        html += `
            <div class="speech-box">
                <div class="speech-header">
                    <span><i class="fas fa-comment-dots"></i> Speech para el agente</span>
                    <button class="btn-copy" onclick="copySpeech('${step.speech.replace(/'/g, "\\'").replace(/\n/g, '\\n')}')">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                </div>
                <div class="speech-text">${speechText}</div>
            </div>
        `;
    }

    if (step.decisions && step.decisions.length > 0) {
        html += `<div class="decision-buttons">`;
        step.decisions.forEach(decision => {
            const iconMap = { 'success': '✅', 'danger': '❌', 'warning': '⚠️', 'info': 'ℹ️',
                'closure': '🏁' };
            const icon = iconMap[decision.type] || '📌';
            html += `
                <button class="btn-decision ${decision.type}" onclick="handleDecision(${step.id}, '${decision.id}', ${decision.nextStep || 'null'})">
                    <span class="icon">${icon}</span>
                    ${decision.label}
                </button>
            `;
        });
        html += `</div>`;
    }

    stepCard.innerHTML = html;

    if (step.isClosure) {
        closureResult.disabled = false;
        closureAction.disabled = false;
        applyClosure.disabled = false;
        if (step.defaultClosure) {
            closureResult.value = step.defaultClosure.result || '';
            closureAction.value = step.defaultClosure.action || '';
        }
    } else {
        closureResult.disabled = true;
        closureAction.disabled = true;
        applyClosure.disabled = true;
    }

    stepCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    saveProgress();
    lastAction.innerHTML = `<i class="fas fa-arrow-right"></i> ${step.action}`;
}

// ============================================================
//  MANEJAR DECISIONES
// ============================================================

function handleDecision(stepId, decisionId, nextStep) {
    const step = getStep(stepId);
    const decision = step.decisions.find(d => d.id === decisionId);

    if (decision) {
        const actionText = decision.label.replace(/[✅❌⚠️ℹ️🏁📌]\s*/, '');
        lastAction.innerHTML = `<i class="fas fa-arrow-right"></i> ${actionText}`;
    }

    if (nextStep === null) {
        if (step.isClosure) {
            showToast('🎯 Caso completado. Aplica el cierre.', 'success');
        }
        return;
    }

    const nextStepData = getStep(nextStep);
    if (nextStepData) {
        renderStep(nextStep);
    } else {
        showToast('⚠️ El paso siguiente no existe', 'error');
    }
}

// ============================================================
//  PERSISTENCIA
// ============================================================

function saveProgress() {
    try {
        localStorage.setItem('b2bFlow_v10', JSON.stringify({
            step: currentStepId,
            history: history,
            isClosed: isClosed,
            timestamp: Date.now()
        }));
    } catch (e) {}
}

function loadProgress() {
    try {
        const saved = localStorage.getItem('b2bFlow_v10');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.step && getStep(data.step)) {
                history = data.history || [data.step];
                isClosed = data.isClosed || false;
                renderStep(data.step);
                return true;
            }
        }
    } catch (e) {}
    return false;
}

// ============================================================
//  CONECTAR AL SERVIDOR (LEER EXCEL)
// ============================================================

function connectToServer(url) {
    if (!url || url.trim() === '') {
        showToast('⚠️ Ingresa la URL de la API', 'warning');
        return;
    }

    loadingOverlay.classList.remove('hidden');
    loadingSubMsg.textContent = 'Conectando al servidor B2B...';

    // Determinar si la URL es relativa o absoluta
    let fullUrl = url;
    if (url.startsWith('/')) {
        fullUrl = window.location.origin + url;
    }

    fetch(fullUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            // Leer como ArrayBuffer (archivo binario)
            return response.arrayBuffer();
        })
        .then(buffer => {
            try {
                // Leer el Excel con SheetJS
                const workbook = XLSX.read(buffer, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(firstSheet);

                if (!data || data.length === 0) {
                    throw new Error('El archivo Excel está vacío');
                }

                // Convertir datos a flujo
                const steps = {};
                data.forEach(row => {
                    const id = parseInt(row.id);
                    if (!steps[id]) {
                        steps[id] = {
                            id: id,
                            phase: row.phase || 'fraude',
                            title: row.title || `Paso ${id}`,
                            badge: row.badge || 'Desk Review',
                            action: row.action || '',
                            speech: row.speech || '',
                            decisions: [],
                            isClosure: row.isClosure === 'TRUE' || row.isClosure === true,
                            defaultClosure: row.default_result ? {
                                result: row.default_result,
                                action: row.default_action || 'no-cancelar'
                            } : null
                        };
                    }
                    if (row.decision_id && row.decision_label) {
                        steps[id].decisions.push({
                            id: row.decision_id,
                            label: row.decision_label,
                            type: row.decision_type || 'info',
                            nextStep: row.next_step === 'NULL' || row.next_step === null ? null : parseInt(row
                                .next_step)
                        });
                    }
                });

                flowData.steps = Object.values(steps).sort((a, b) => a.id - b.id);

                if (flowData.steps.length === 0) {
                    throw new Error('No se encontraron pasos en el archivo');
                }

                isConnected = true;
                statusBadge.className = 'badge badge-green';
                statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> Conectado';
                sourceBadge.innerHTML = '<i class="fas fa-server"></i> Excel ✓';

                showToast(`✅ Flujo cargado: ${flowData.steps.length} pasos`, 'success');
                loadingOverlay.classList.add('hidden');

                // Guardar URL en localStorage
                try {
                    localStorage.setItem('b2bApiUrl_v10', url);
                } catch (e) {}

                // Iniciar flujo
                if (!loadProgress()) {
                    renderStep(1);
                }
            } catch (e) {
                throw new Error('Error al procesar el Excel: ' + e.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            loadingSubMsg.textContent = '⚠️ ' + error.message;
            statusBadge.className = 'badge badge-red';
            statusBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';

            showToast('❌ Error al conectar: ' + error.message, 'error');

            // Fallback al flujo por defecto después de 2 segundos
            setTimeout(() => {
                useDefaultFlow();
                loadingOverlay.classList.add('hidden');
            }, 2000);
        });
}

// ============================================================
//  USAR FLUJO POR DEFECTO
// ============================================================

function useDefaultFlow() {
    flowData = JSON.parse(JSON.stringify(defaultFlow));
    isConnected = false;
    statusBadge.className = 'badge badge-orange';
    statusBadge.innerHTML = '<i class="fas fa-database"></i> Flujo por defecto';
    sourceBadge.innerHTML = '<i class="fas fa-code"></i> Integrado';

    showToast(`✅ Usando flujo por defecto (${flowData.steps.length} pasos)`, 'info');

    if (!loadProgress()) {
        renderStep(1);
    }
}

// ============================================================
//  EXPORTAR REPORTE
// ============================================================

function exportReport() {
    const uniqueSteps = new Set(history);
    const stepNames = [];
    uniqueSteps.forEach(id => {
        const step = getStep(id);
        if (step) stepNames.push(`${id}. ${step.title}`);
    });

    const report = `
========================================
REPORTE DE GESTIÓN B2B
========================================
Fecha: ${new Date().toLocaleString()}
Duración: ${elapsedTime.textContent}
Pasos recorridos: ${history.length}
Pasos únicos: ${uniqueSteps.size}
Estado: ${isClosed ? '✅ COMPLETADO' : '⏳ EN PROCESO'}

RUTA RECORRIDA:
${stepNames.map((s, i) => `  ${i+1}. ${s}`).join('\n')}

CIERRE:
Resultado: ${closureResult.value ? closureResult.options[closureResult.selectedIndex]?.text || 'No seleccionado' : 'No seleccionado'}
Acción: ${closureAction.value ? closureAction.options[closureAction.selectedIndex]?.text || 'No seleccionado' : 'No seleccionado'}
========================================
    `;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_b2b_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📄 Reporte exportado', 'success');
}

// ============================================================
//  TIMER
// ============================================================

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    const timeStr = `${mins}:${secs}`;
    sessionTime.textContent = timeStr;
    elapsedTime.textContent = timeStr;
}

// ============================================================
//  EVENT LISTENERS
// ============================================================

// Conectar al servidor
btnConnect.addEventListener('click', () => {
    const url = apiUrl.value.trim();
    if (url) {
        connectToServer(url);
    } else {
        showToast('⚠️ Ingresa la URL de la API', 'warning');
    }
});

// Enter en el input
apiUrl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        btnConnect.click();
    }
});

// Usar flujo por defecto
btnUseDefault.addEventListener('click', () => {
    if (confirm('¿Usar el flujo por defecto? Se perderá el flujo cargado.')) {
        useDefaultFlow();
        showToast('🔄 Flujo por defecto activado', 'info');
        try {
            localStorage.removeItem('b2bApiUrl_v10');
        } catch (e) {}
    }
});

// Anterior
btnPrevious.addEventListener('click', () => {
    if (history.length > 1) {
        history.pop();
        const prevStep = history[history.length - 1];
        renderStep(prevStep);
        showToast('⬅️ Volviendo al paso anterior', 'info');
    }
});

// Reiniciar
btnReset.addEventListener('click', () => {
    if (confirm('¿Reiniciar el flujo?')) {
        history = [];
        isClosed = false;
        renderStep(1);
        showToast('🔄 Flujo reiniciado', 'info');
        try {
            localStorage.removeItem('b2bFlow_v10');
        } catch (e) {}
    }
});

// Guardar progreso
btnSaveProgress.addEventListener('click', () => {
    saveProgress();
    showToast('💾 Progreso guardado', 'success');
});

// Exportar
btnExport.addEventListener('click', exportReport);

// Aplicar cierre
applyClosure.addEventListener('click', () => {
    const result = closureResult.value;
    const action = closureAction.value;

    if (!result || !action) {
        showToast('⚠️ Selecciona Resultado y Acción', 'warning');
        return;
    }

    const resultLabels = {
        'falso-positivo': '✅ Falso Positivo',
        'fraude-suplantacion': '🔴 Fraude por Suplantación',
        'fraude-suscripcion': '🔴 Fraude por Suscripción',
        'posible-fraude': '🟡 Posible Fraude',
        'axb': '🟡 AxB',
        'cierre-masivo': '📦 Cierre Masivo'
    };

    const actionLabels = {
        'no-cancelar': '✅ No Cancelar',
        'cancelar': '❌ Cancelar',
        'suspender': '⏸️ Suspender'
    };

    const resultText = resultLabels[result] || result;
    const actionText = actionLabels[action] || action;

    showToast(`🏁 Caso cerrado: ${resultText} | ${actionText}`, 'success');

    closureResult.disabled = true;
    closureAction.disabled = true;
    applyClosure.disabled = true;
    isClosed = true;
    updateProgress();
    lastAction.innerHTML = `<i class="fas fa-flag-checkered"></i> Cierre aplicado: ${resultText}`;
    saveProgress();
});

// ============================================================
//  INICIALIZACIÓN
// ============================================================

function init() {
    // Cargar URL guardada
    try {
        const savedUrl = localStorage.getItem('b2bApiUrl_v10');
        if (savedUrl) {
            apiUrl.value = savedUrl;
        }
    } catch (e) {}

    // Intentar conectar automáticamente si hay URL guardada
    const url = apiUrl.value.trim();
    if (url) {
        connectToServer(url);
    } else {
        // Usar flujo por defecto
        useDefaultFlow();
        loadingOverlay.classList.add('hidden');
    }

    // Timer
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();

    console.log('🌳 Árbol B2B v10 - Interfaz Limpia');
    console.log('📋 ' + (url ? 'Conectando a: ' + url : 'Usando flujo por defecto'));
    console.log('💡 CSS y JS separados para mejor mantenimiento');
}

// Iniciar
init();