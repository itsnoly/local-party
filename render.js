/**
 * Local Party - Controller principal
 */

// Global App State & Config
const notyf = new Notyf({ duration: 2000, position: { x: 'center', y: 'top' } });
const AVATAR_COLORS = ['#38bdf8', '#f43f5e', '#a855f7', '#34d399', '#fbbf24', '#f472b6', '#818cf8'];

// Inicialização segura do Socket.IO
let socket;
if (typeof io !== 'undefined') {
    socket = io("https://local-party.herokuapp.com", {
        transports: ['websocket', 'polling'],
        timeout: 3000
    });
} else {
    socket = { on: () => {}, emit: () => {} };
}

// Helpers
function randomString(length, chars) {
    let result = '';
    for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

function getRandomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function formatTimeStamp(actionState, username, secondsContext) {
    let hours = parseInt(Math.round(secondsContext) / 3600, 10);
    let minutes = parseInt((secondsContext / 60) % 60, 10);
    let seconds = Math.round(secondsContext) % 60;

    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    let timeText = `${minutes}:${seconds}`;
    if (hours !== "00" && hours !== 0) {
        timeText = `${hours}:${minutes}:${seconds}`;
    }
    return `${username} ${actionState} o vídeo em ${timeText}`;
}

// Renderização de Mensagens no Chat
function appendChatMessage(message, isService = false) {
    const messagesBox = document.getElementById("messages-box");
    if (!messagesBox) return;

    if (isService) {
        const msgDiv = document.createElement("div");
        msgDiv.className = "msg-service";
        msgDiv.innerHTML = `<i class="fas fa-info-circle me-1"></i> ${message.content}`;
        messagesBox.appendChild(msgDiv);
        messagesBox.scrollTop = messagesBox.scrollHeight;

        // Auto-remover mensagens de serviço em 5 segundos
        setTimeout(() => {
            msgDiv.classList.add("fade-out");
            setTimeout(() => msgDiv.remove(), 500);
        }, 5000);
    } else {
        const container = document.createElement("div");
        container.className = "msg-user-container";

        const initial = message.name ? message.name.charAt(0).toUpperCase() : "U";
        const avatarBg = message.pfp || "#6366f1";

        container.innerHTML = `
            <div class="msg-avatar" style="background-color: ${avatarBg}">
                ${initial}
            </div>
            <div class="msg-body">
                <span class="msg-username" style="color: ${avatarBg}">${message.name}</span>
                <div class="msg-content">${message.content}</div>
            </div>
        `;

        messagesBox.appendChild(container);
        messagesBox.scrollTop = messagesBox.scrollHeight;
    }
}

function updateMemberCount(count) {
    const memberCount = document.getElementById("memberCount");
    if (memberCount) memberCount.textContent = count;
}

// Controle de Navegação entre Telas
function switchView(viewId) {
    const views = ['landing', 'create', 'join', 'room'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = (id === viewId) ? (id === 'room' ? 'flex' : 'flex') : 'none';
        }
    });
}

function enterRoomUI(roomName, roomCode) {
    const videoPlayer = document.getElementById("video-player");

    document.getElementById("roomNameText").innerHTML = roomName;
    document.getElementById("roomCodeText").innerHTML = roomCode;

    const videoPath = localStorage.getItem("videoPath");
    if (videoPath && videoPlayer) {
        videoPlayer.setAttribute("src", videoPath);
        videoPlayer.load();
    }

    appendChatMessage({ name: "Local Party", content: "Bem-vindo ao Local Party! Assista vídeos em sintonia." }, true);
    appendChatMessage({ name: "Local Party", content: `Sala: ${roomName} (${roomCode})` }, true);

    document.title = `Local Party | ${roomName}`;
    switchView('room');
}

// Configuração de Eventos de Interface (DOM Load)
document.addEventListener("DOMContentLoaded", () => {
    // Configurações do formulário Criar Sala (Abas Arquivo / URL)
    const btnCreateTypeFile = document.getElementById("btnCreateTypeFile");
    const btnCreateTypeUrl = document.getElementById("btnCreateTypeUrl");
    const createSectionFile = document.getElementById("createSectionFile");
    const createSectionUrl = document.getElementById("createSectionUrl");

    if (btnCreateTypeFile && btnCreateTypeUrl) {
        btnCreateTypeFile.addEventListener("click", () => {
            btnCreateTypeFile.classList.add("active");
            btnCreateTypeUrl.classList.remove("active");
            createSectionFile.classList.remove("d-none");
            createSectionUrl.classList.add("d-none");
        });

        btnCreateTypeUrl.addEventListener("click", () => {
            btnCreateTypeUrl.classList.add("active");
            btnCreateTypeFile.classList.remove("active");
            createSectionUrl.classList.remove("d-none");
            createSectionFile.classList.add("d-none");
        });
    }

    // Configurações do formulário Entrar na Sala (Abas Arquivo / URL)
    const btnJoinTypeFile = document.getElementById("btnJoinTypeFile");
    const btnJoinTypeUrl = document.getElementById("btnJoinTypeUrl");
    const joinSectionFile = document.getElementById("joinSectionFile");
    const joinSectionUrl = document.getElementById("joinSectionUrl");

    if (btnJoinTypeFile && btnJoinTypeUrl) {
        btnJoinTypeFile.addEventListener("click", () => {
            btnJoinTypeFile.classList.add("active");
            btnJoinTypeUrl.classList.remove("active");
            joinSectionFile.classList.remove("d-none");
            joinSectionUrl.classList.add("d-none");
        });

        btnJoinTypeUrl.addEventListener("click", () => {
            btnJoinTypeUrl.classList.add("active");
            btnJoinTypeFile.classList.remove("active");
            joinSectionUrl.classList.remove("d-none");
            joinSectionFile.classList.add("d-none");
        });
    }

    // Copiar Código da Sala
    const roomCodeText = document.getElementById('roomCodeText');
    if (roomCodeText) {
        roomCodeText.addEventListener('click', () => {
            let text = roomCodeText.innerHTML.trim();
            if (text && text !== "----") {
                navigator.clipboard.writeText(text).then(() => {
                    notyf.success("Código copiado!");
                });
            }
        });
    }

    // Inputs de Mídia Local/URL
    document.getElementById("createFileInput")?.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            localStorage.setItem("videoSize", file.size);
            localStorage.setItem("videoPath", (window.URL || window.webkitURL).createObjectURL(file));
        }
    });

    document.getElementById("createUrlInput")?.addEventListener("change", (e) => {
        const url = e.target.value.trim();
        if (url) {
            localStorage.setItem("videoSize", "URL");
            localStorage.setItem("videoPath", url);
        }
    });

    document.getElementById("joinFileInput")?.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            localStorage.setItem("videoSize", file.size);
            localStorage.setItem("videoPath", (window.URL || window.webkitURL).createObjectURL(file));
        }
    });

    document.getElementById("joinUrlInput")?.addEventListener("change", (e) => {
        const url = e.target.value.trim();
        if (url) {
            localStorage.setItem("videoSize", "URL");
            localStorage.setItem("videoPath", url);
        }
    });
});

// Eventos do Socket.IO (WebSockets)
socket.on('user-joined', data => {
    if (data.roomCode == localStorage.getItem("roomCode")) {
        appendChatMessage({ name: data.name, content: `${data.name} entrou na sala.`, pfp: data.pfp }, true);
        updateMemberCount(data.members);

        // Se o novo usuário não possuir a URL e a sala for via URL, sincroniza
        if (data.videoPath && data.videoPath.startsWith('http')) {
            const videoPlayer = document.getElementById("video-player");
            if (videoPlayer && !videoPlayer.getAttribute("src")) {
                videoPlayer.setAttribute("src", data.videoPath);
                videoPlayer.load();
            }
        }
    }
});

socket.on('updateMemberInfo', data => {
    if (data.roomCode == localStorage.getItem("roomCode")) {
        updateMemberCount(data.members);
    }
});

socket.on('receive', data => {
    appendChatMessage({ name: data.name, content: data.message, pfp: data.pfp }, false);
});

socket.on('left', data => {
    appendChatMessage({ name: 'Local Party', content: `${data.name} saiu da sala.`, pfp: '#f3dfbf' }, true);
    updateMemberCount(data.members);
});

let allowEmit = true;
socket.on('playerControlUpdate', data => {
    const videoPlayer = document.getElementById("video-player");
    if (!videoPlayer) return;

    if (data.message == "play") {
        videoPlayer.currentTime = data.context;
        allowEmit = false;
        videoPlayer.play();
        appendChatMessage({ name: "Local Party", content: formatTimeStamp("deu play em", data.username, data.context) }, true);
    }
    if (data.message == "pause") {
        videoPlayer.currentTime = data.context;
        allowEmit = false;
        videoPlayer.pause();
        appendChatMessage({ name: "Local Party", content: formatTimeStamp("pausou em", data.username, data.context) }, true);
    }
});

// Inicialização de Dados Locais do Usuário
if (!localStorage.getItem("username")) localStorage.setItem("username", "convidado");
if (!localStorage.getItem("pfpUrl")) localStorage.setItem("pfpUrl", getRandomItem(AVATAR_COLORS));

// Cliques nos Botões e Ações Principais
document.addEventListener("click", (e) => {
    const target = e.target;

    if (target.id == "createRoomButton" || target.closest("#createRoomButton")) {
        switchView('create');
    }

    if (target.id == "joinRoomButton" || target.closest("#joinRoomButton")) {
        switchView('join');
    }

    if (target.classList.contains("back-btn") || target.closest(".back-btn")) {
        switchView('landing');
    }

    // Ação: Criar Sala
    if (target.id == "roomCreateButton" || target.closest("#roomCreateButton")) {
        const roomName = document.getElementById("roomname").value.trim();
        const username = document.getElementById("create-username").value.trim();
        const videoPath = localStorage.getItem("videoPath");

        if (!roomName || !username || !videoPath) {
            document.getElementById("createRoomText").innerHTML = "Preencha todos os campos e selecione o vídeo ou digite a URL.";
            return;
        }

        const roomCode = randomString(5, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
        localStorage.setItem("roomName", roomName);
        localStorage.setItem("username", username);
        localStorage.setItem("roomCode", roomCode);

        const videoSize = localStorage.getItem("videoSize") || "URL";

        socket.emit('new-user-joined', {
            name: username,
            roomCode: roomCode,
            pfp: localStorage.getItem("pfpUrl"),
            videoPath: videoPath
        });

        enterRoomUI(roomName, roomCode);

        // Notifica API backend
        fetch("https://local-party.herokuapp.com/room/create", {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "roomName": roomName, "roomCode": roomCode, "videoSize": videoSize })
        }).catch(() => {});
    }

    // Ação: Entrar na Sala
    if (target.id == "roomJoinButton" || target.closest("#roomJoinButton")) {
        const inputRoomCode = document.getElementById("roomCode").value.trim();
        const username = document.getElementById("join-username").value.trim();
        const videoSize = localStorage.getItem("videoSize") || "URL";

        if (!inputRoomCode || !username) {
            document.getElementById("joinRoomText").innerHTML = "Preencha o código da sala e seu apelido.";
            return;
        }

        localStorage.setItem("roomCode", inputRoomCode);
        localStorage.setItem("username", username);

        socket.emit('new-user-joined', {
            name: username,
            roomCode: inputRoomCode,
            pfp: localStorage.getItem("pfpUrl"),
            videoPath: localStorage.getItem("videoPath")
        });

        enterRoomUI("SALA " + inputRoomCode, inputRoomCode);

        fetch("https://local-party.herokuapp.com/room/join", {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "roomCode": inputRoomCode, "videoSize": videoSize })
        }).catch(() => {});
    }

    // Ação: Sair da Sala
    if (target.id == "roomLeaveButton" || target.closest("#roomLeaveButton")) {
        socket.emit('disconnectUser', {
            roomCode: localStorage.getItem("roomCode"),
            name: localStorage.getItem("username"),
            pfp: localStorage.getItem("pfpUrl")
        });
        location.reload();
    }
});

// Envio de Mensagens do Chat
const chatForm = document.getElementById("send-form");
if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById("messageInp");
        const text = input.value.trim();

        if (text.length > 0) {
            socket.emit('send', text);
            appendChatMessage({
                name: localStorage.getItem("username"),
                content: text,
                pfp: localStorage.getItem("pfpUrl")
            }, false);
            input.value = "";
        }
    });
}

// Sincronização de Play/Pause do Vídeo
const videoPlayer = document.getElementById("video-player");
if (videoPlayer) {
    videoPlayer.addEventListener('play', () => {
        if (allowEmit) {
            socket.emit("playerControl", { message: "play", context: videoPlayer.currentTime, roomCode: localStorage.getItem("roomCode") });
            appendChatMessage({ name: "Local Party", content: formatTimeStamp("deu play em", "Você", videoPlayer.currentTime) }, true);
        }
        setTimeout(() => { allowEmit = true; }, 500);
    });

    videoPlayer.addEventListener('pause', () => {
        if (allowEmit) {
            socket.emit("playerControl", { message: "pause", context: videoPlayer.currentTime, roomCode: localStorage.getItem("roomCode") });
            appendChatMessage({ name: "Local Party", content: formatTimeStamp("pausou em", "Você", videoPlayer.currentTime) }, true);
        }
        setTimeout(() => { allowEmit = true; }, 500);
    });
}