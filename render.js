const notyf = new Notyf({ duration: 2000, position: { x: 'center', y: 'top' } });
const AVATAR_COLORS = ['#38bdf8', '#f43f5e', '#a855f7', '#34d399', '#fbbf24', '#f472b6', '#818cf8'];

let socket;
if (typeof io !== 'undefined') {
    socket = io("https://local-party.herokuapp.com", {
        transports: ['websocket', 'polling'],
        timeout: 3000
    });
} else {
    socket = { on: () => {}, emit: () => {} };
}

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
    if (hours !== "00" && hours !== 0) timeText = `${hours}:${minutes}:${seconds}`;
    
    return `${username} ${actionState} o vídeo em ${timeText}`;
}

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
            <div class="msg-avatar" style="background-color: ${avatarBg}">${initial}</div>
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

function switchView(viewId) {
    const views = ['landing', 'create', 'join', 'room'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === viewId) ? 'flex' : 'none';
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

// Configuração dos Botões e Inputs DOM
document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("username")) localStorage.setItem("username", "convidado");
    if (!localStorage.getItem("pfpUrl")) localStorage.setItem("pfpUrl", getRandomItem(AVATAR_COLORS));

    // Abas de seleção Criar Sala
    document.getElementById("btnCreateTypeFile")?.addEventListener("click", () => {
        document.getElementById("btnCreateTypeFile").classList.add("active");
        document.getElementById("btnCreateTypeUrl").classList.remove("active");
        document.getElementById("createSectionFile").classList.remove("d-none");
        document.getElementById("createSectionUrl").classList.add("d-none");
    });

    document.getElementById("btnCreateTypeUrl")?.addEventListener("click", () => {
        document.getElementById("btnCreateTypeUrl").classList.add("active");
        document.getElementById("btnCreateTypeFile").classList.remove("active");
        document.getElementById("createSectionUrl").classList.remove("d-none");
        document.getElementById("createSectionFile").classList.add("d-none");
    });

    // Abas de seleção Entrar na Sala
    document.getElementById("btnJoinTypeFile")?.addEventListener("click", () => {
        document.getElementById("btnJoinTypeFile").classList.add("active");
        document.getElementById("btnJoinTypeUrl").classList.remove("active");
        document.getElementById("joinSectionFile").classList.remove("d-none");
        document.getElementById("joinSectionUrl").classList.add("d-none");
    });

    document.getElementById("btnJoinTypeUrl")?.addEventListener("click", () => {
        document.getElementById("btnJoinTypeUrl").classList.add("active");
        document.getElementById("btnJoinTypeFile").classList.remove("active");
        document.getElementById("joinSectionUrl").classList.remove("d-none");
        document.getElementById("joinSectionFile").classList.add("d-none");
    });

    // Copiar código
    document.getElementById('roomCodeText')?.addEventListener('click', () => {
        let text = document.getElementById('roomCodeText').innerHTML.trim();
        if (text && text !== "----") {
            navigator.clipboard.writeText(text).then(() => notyf.success("Código copiado!"));
        }
    });

    // Inputs de Mídia
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

// Resposta aos Eventos do Socket
socket.on('user-joined', data => {
    if (data.roomCode == localStorage.getItem("roomCode")) {
        appendChatMessage({ name: data.name, content: `${data.name} entrou na sala.`, pfp: data.pfp }, true);
        updateMemberCount(data.members);

        // Se o Host perceber um novo usuário entrando, ele envia a URL e a posição atual do vídeo!
        const videoPlayer = document.getElementById("video-player");
        const videoPath = localStorage.getItem("videoPath");

        if (videoPath && videoPlayer) {
            socket.emit("playerControl", {
                message: "syncUrl|" + videoPath,
                context: videoPlayer.currentTime,
                isPlaying: !videoPlayer.paused,
                roomCode: localStorage.getItem("roomCode")
            });
        }
    }
});

let allowEmit = true;
socket.on('playerControlUpdate', data => {
    const videoPlayer = document.getElementById("video-player");
    if (!videoPlayer) return;

    // Sincronização Automática de URL e Posição do Vídeo para Convidados
    if (data.message && data.message.startsWith("syncUrl|")) {
        const videoUrl = data.message.replace("syncUrl|", "");
        if (videoUrl && videoPlayer.getAttribute("src") !== videoUrl) {
            localStorage.setItem("videoPath", videoUrl);
            videoPlayer.setAttribute("src", videoUrl);
            videoPlayer.currentTime = data.context || 0;
            videoPlayer.load();
            if (data.isPlaying) videoPlayer.play();
            appendChatMessage({ name: "Local Party", content: "Vídeo sincronizado via URL!" }, true);
        }
        return;
    }

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

socket.on('receive', data => {
    appendChatMessage({ name: data.name, content: data.message, pfp: data.pfp }, false);
});

socket.on('left', data => {
    appendChatMessage({ name: 'Local Party', content: `${data.name} saiu da sala.`, pfp: '#f3dfbf' }, true);
    updateMemberCount(data.members);
});

// Cliques nos Botões Principais
document.addEventListener("click", (e) => {
    const target = e.target;

    if (target.id == "createRoomButton" || target.closest("#createRoomButton")) {
        switchView('create');
    }

    if (target.id == "joinRoomButton" || target.closest("#joinRoomButton")) {
        switchView('join');
    }

    if (target.id == "backButtonFromCreate" || target.id == "backButtonFromJoin" || target.closest(".back-btn")) {
        switchView('landing');
    }

    // Ação: Criar Sala
    if (target.id == "roomCreateButton" || target.closest("#roomCreateButton")) {
        const roomName = document.getElementById("roomname").value.trim();
        const username = document.getElementById("create-username").value.trim();
        const videoPath = localStorage.getItem("videoPath");

        if (!roomName || !username || !videoPath) {
            document.getElementById("createRoomText").innerHTML = "Preencha todos os campos e escolha uma mídia ou URL.";
            return;
        }

        const roomCode = randomString(5, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
        localStorage.setItem("roomName", roomName);
        localStorage.setItem("username", username);
        localStorage.setItem("roomCode", roomCode);

        socket.emit('new-user-joined', { name: username, roomCode: roomCode, pfp: localStorage.getItem("pfpUrl") });
        enterRoomUI(roomName, roomCode);

        fetch("https://local-party.herokuapp.com/room/create", {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "roomName": roomName, "roomCode": roomCode, "videoSize": localStorage.getItem("videoSize") || "URL" })
        }).catch(() => {});
    }

    // Ação: Entrar na Sala
    if (target.id == "roomJoinButton" || target.closest("#roomJoinButton")) {
        const inputRoomCode = document.getElementById("roomCode").value.trim();
        const username = document.getElementById("join-username").value.trim();

        if (!inputRoomCode || !username) {
            document.getElementById("joinRoomText").innerHTML = "Preencha o código da sala e seu apelido.";
            return;
        }

        localStorage.setItem("roomCode", inputRoomCode);
        localStorage.setItem("username", username);

        socket.emit('new-user-joined', { name: username, roomCode: inputRoomCode, pfp: localStorage.getItem("pfpUrl") });
        enterRoomUI("SALA " + inputRoomCode, inputRoomCode);

        fetch("https://local-party.herokuapp.com/room/join", {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "roomCode": inputRoomCode, "videoSize": localStorage.getItem("videoSize") || "URL" })
        }).catch(() => {});
    }

    // Sair da Sala
    if (target.id == "roomLeaveButton" || target.closest("#roomLeaveButton")) {
        socket.emit('disconnectUser', {
            roomCode: localStorage.getItem("roomCode"),
            name: localStorage.getItem("username"),
            pfp: localStorage.getItem("pfpUrl")
        });
        location.reload();
    }
});

// Form do Chat
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

// Player Play/Pause Event Sync
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