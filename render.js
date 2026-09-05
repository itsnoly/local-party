const notyf = new Notyf({ duration: 1500, position: { x: 'center', y: 'top' } });

// Inicialização segura do Socket.IO sem travar o app
let socket;
if (typeof io !== 'undefined') {
    socket = io("https://local-party.herokuapp.com", {
        transports: ['websocket', 'polling'],
        timeout: 5000
    });
} else {
    socket = { on: () => {}, emit: () => {} };
}

function randomString(length, chars) {
    let result = '';
    for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

function time(state, username, context) {
    let hours = parseInt(Math.round(context) / 60 / 60, 10);
    let minutes = parseInt((context / 60) % 60, 10);
    let seconds = Math.round(context) % 60;
    hours = hours < 10 ? "0" + hours.toString() : hours.toString();
    minutes = minutes < 10 ? '0' + minutes.toString() : minutes.toString();
    seconds = seconds < 10 ? '0' + seconds.toString() : seconds.toString();
    
    let contentString = `${username} ${state} the video at ${minutes}:${seconds}`;
    if (hours !== "00" && hours !== 0) {
        contentString = `${username} ${state} the video at ${hours}:${minutes}:${seconds}`;
    }
    return contentString;
}

/**
 * Adiciona mensagens ao chat.
 * @param {Object} message - Objeto com name, content e pfp (cor)
 * @param {Boolean} isService - Se true, é mensagem de serviço removida em 5s
 */
const append = (message, isService = false) => {
    const messagesBox = document.getElementById("messages-box");
    if (!messagesBox) return;

    if (isService) {
        const msgDiv = document.createElement("div");
        msgDiv.className = "msg-service";
        msgDiv.innerHTML = `<i class="fas fa-info-circle me-1"></i> ${message.content}`;
        messagesBox.appendChild(msgDiv);
        messagesBox.scrollTop = messagesBox.scrollHeight;

        // Auto-remover após 5 segundos
        setTimeout(() => {
            msgDiv.classList.add("fade-out");
            setTimeout(() => {
                msgDiv.remove();
            }, 500);
        }, 5000);
    } else {
        const container = document.createElement("div");
        container.className = "msg-user-container";
        
        // Pega a primeira letra do nome para o Avatar
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
};

function appendData(roomName, roomCode) {
    append({ name: "Local Party", content: "Bem-vindo ao Local Party! Assista vídeos em sintonia.", pfp: "#f3dfbf" }, true);
    append({ name: "Local Party", content: `Sala: ${roomName} (${roomCode})`, pfp: "#f3dfbf" }, true);
}

function updateMemberCount(count) {
    const memberCount = document.getElementById("memberCount");
    if (memberCount) memberCount.textContent = count;
}

// Alternar entre Arquivo Local e Link MP4
document.addEventListener("DOMContentLoaded", function() {
    const btnTypeFile = document.getElementById("btnTypeFile");
    const btnTypeUrl = document.getElementById("btnTypeUrl");
    const sectionLocalFile = document.getElementById("sectionLocalFile");
    const sectionUrlLink = document.getElementById("sectionUrlLink");

    if (btnTypeFile && btnTypeUrl) {
        btnTypeFile.addEventListener("click", () => {
            btnTypeFile.classList.add("active");
            btnTypeUrl.classList.remove("active");
            sectionLocalFile.classList.remove("d-none");
            sectionUrlLink.classList.add("d-none");
        });

        btnTypeUrl.addEventListener("click", () => {
            btnTypeUrl.classList.add("active");
            btnTypeFile.classList.remove("active");
            sectionUrlLink.classList.remove("d-none");
            sectionLocalFile.classList.add("d-none");
        });
    }

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
});

var videoPlayer = document.getElementById("video-player");

const landingPage = document.getElementById("landing");
const createPage = document.getElementById("create");
const joinPage = document.getElementById("join");
const roomPage = document.getElementById("room");

socket.on('user-joined', data => {
    if (data.roomCode == localStorage.getItem("roomCode")) {
        append({ name: data.name, content: `${data.name} entrou na sala.`, pfp: data.pfp }, true);
        updateMemberCount(data.members);
    }
});

socket.on('updateMemberInfo', data => {
    if (data.roomCode == localStorage.getItem("roomCode")) {
        updateMemberCount(data.members);
    }
});

socket.on('receive', data => {
    append({ name: data.name, content: data.message, pfp: data.pfp }, false);
});

socket.on('left', data => {
    append({ name: 'Local Party', content: `${data.name} saiu da sala.`, pfp: '#f3dfbf' }, true);
    updateMemberCount(data.members);
});

socket.on('playerControlUpdate', data => {
    if (data.message == "play") {
        videoPlayer.currentTime = data.context;
        allowEmit = false;
        videoPlayer.play();
        append({ name: "Local Party", content: time("deu play em", data.username, data.context), pfp: "#f3dfbf" }, true);
    }
    if (data.message == "pause") {
        videoPlayer.currentTime = data.context;
        allowEmit = false;
        videoPlayer.pause();
        append({ name: "Local Party", content: time("pausou em", data.username, data.context), pfp: "#f3dfbf" }, true);
    }
});

if (localStorage.getItem("username") == null) {
    localStorage.setItem("username", "convidado");
}

const colors = ['#38bdf8', '#f43f5e', '#a855f7', '#34d399', '#fbbf24', '#f472b6', '#818cf8'];

function random_item(items) {
    return items[Math.floor(Math.random() * items.length)];
}

if (localStorage.getItem("pfpUrl") == null) {
    localStorage.setItem("pfpUrl", random_item(colors));
}

document.addEventListener("click", function (e) {
    if (e.target.id == "createRoomButton") {
        landingPage.style.display = "none";
        createPage.style.display = "flex";
    }
    if (e.target.id == "roomCreateButton") {
        const roomName = document.getElementById("roomname").value;
        const username = document.getElementById("create-username").value;

        if (roomName.length == 0 || username.length == 0 || !localStorage.getItem("videoPath")) {
            document.getElementById("createRoomText").innerHTML = "Preencha todos os campos e selecione um vídeo ou URL.";
            return;
        }

        localStorage.setItem("roomName", roomName);
        localStorage.setItem("username", username);
        const roomCode = randomString(5, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
        
        document.getElementById("createRoomText").innerHTML = "";
        document.getElementById("roomNameText").innerHTML = roomName;
        document.getElementById("roomCodeText").innerHTML = roomCode;
        videoPlayer.setAttribute("src", localStorage.getItem("videoPath"));

        var raw = JSON.stringify({
            "roomName": roomName,
            "roomCode": roomCode,
            "videoSize": localStorage.getItem("videoSize") || "100"
        });

        fetch("https://local-party.herokuapp.com/room/create", {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: raw
        })
        .then(async (result) => {
            const resp = await result.json();
            if (resp.message == "success") {
                localStorage.setItem("roomCode", roomCode);
                appendData(roomName, roomCode);
                socket.emit('new-user-joined', { name: localStorage.getItem("username"), roomCode: roomCode, pfp: localStorage.getItem("pfpUrl") });
                createPage.style.display = "none";
                document.title = `Local Party | ${roomName}`;
                roomPage.style.display = "flex";
            }
        })
        .catch(error => {
            console.log('error', error);
            // Fallback: entra na sala mesmo se a API do heroku não responder
            localStorage.setItem("roomCode", roomCode);
            appendData(roomName, roomCode);
            createPage.style.display = "none";
            document.title = `Local Party | ${roomName}`;
            roomPage.style.display = "flex";
        });
    }

    if (e.target.id == "joinRoomButton") {
        landingPage.style.display = "none";
        joinPage.style.display = "flex";
    }

    if (e.target.id == "roomJoinButton") {
        const inputRoomCode = document.getElementById("roomCode").value;
        const username = document.getElementById("join-username").value;

        if (inputRoomCode.length == 0 || username.length == 0) {
            document.getElementById("joinRoomText").innerHTML = "Preencha o código da sala e seu nome.";
            return;
        }

        fetch("https://local-party.herokuapp.com/room/join", {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "roomCode": inputRoomCode, "videoSize": localStorage.getItem("videoSize") || "100" })
        })
        .then(async (result) => {
            const resp = await result.json();
            if (resp.message != "success") {
                document.getElementById("joinRoomText").innerHTML = resp.message;
            } else {
                document.getElementById("joinRoomText").innerHTML = "";
                document.getElementById("roomNameText").innerHTML = resp.roomName;
                document.getElementById("roomCodeText").innerHTML = resp.roomCode;
                
                localStorage.setItem("roomCode", inputRoomCode);
                localStorage.setItem("username", username);
                if (localStorage.getItem("videoPath")) {
                    videoPlayer.setAttribute("src", localStorage.getItem("videoPath"));
                }
                appendData(resp.roomName, resp.roomCode);
                socket.emit('new-user-joined', { name: username, roomCode: resp.roomCode, pfp: localStorage.getItem("pfpUrl") });
                joinPage.style.display = "none";
                document.title = `Local Party | ${resp.roomName}`;
                roomPage.style.display = "flex";
            }   
        })
        .catch(error => console.log('error', error));
    }

    if (e.target.id == "roomLeaveButton" || e.target.closest("#roomLeaveButton")) {
        socket.emit('disconnectUser', { roomCode: localStorage.getItem("roomCode"), name: localStorage.getItem("username"), pfp: localStorage.getItem("pfpUrl") });
        location.reload();
    }

    if (e.target.id == "backButton") {
        joinPage.style.display = "none";
        createPage.style.display = "none";
        landingPage.style.display = "flex";
    }
});

// Envio de Mensagens
const form = document.getElementById("send-form");
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const messageInput = document.getElementById("messageInp").value;
        if (messageInput.trim().length !== 0) {
            socket.emit('send', messageInput);
            append({
                name: localStorage.getItem("username"),
                content: messageInput,
                pfp: localStorage.getItem("pfpUrl")
            }, false);
            document.getElementById("messageInp").value = "";
        }
    });
}

let allowEmit = true;
if (videoPlayer) {
    videoPlayer.addEventListener('play', videoControlsHandler, false);
    videoPlayer.addEventListener('pause', videoControlsHandler, false);
}

function videoControlsHandler(e) {
    if (e.type == 'play') {
        if (allowEmit == true) {
            socket.emit("playerControl", {message: "play", context: videoPlayer.currentTime, roomCode: localStorage.getItem("roomCode")});
            append({ name: "Local Party", content: time("deu play em", "Você", videoPlayer.currentTime), pfp: "#f3dfbf" }, true);
        } 
        setTimeout(() => { allowEmit = true; }, 500);
    } else if (e.type == 'pause') {
        if (allowEmit == true) {
            socket.emit("playerControl", {message: "pause", context: videoPlayer.currentTime, roomCode: localStorage.getItem("roomCode")});
            append({ name: "Local Party", content: time("pausou em", "Você", videoPlayer.currentTime), pfp: "#f3dfbf" }, true);
        }
        setTimeout(() => { allowEmit = true; }, 500);
    }
}

// Arquivo Local
function onChangeFile() {
    const file = document.getElementById("file-id").files[0];
    if (!file) return;
    const path = (window.URL || window.webkitURL).createObjectURL(file);
    localStorage.setItem("videoSize", file.size);
    localStorage.setItem("videoPath", path);
}

function onChangeJoinFile() {
    const file = document.getElementById("join-file-id").files[0];
    if (!file) return;
    const path = (window.URL || window.webkitURL).createObjectURL(file);
    localStorage.setItem("videoSize", file.size);
    localStorage.setItem("videoPath", path);
}

// Link Direto MP4 (URL)
function onChangeUrl() {
    const url = document.getElementById("videoUrlInput").value.trim();
    if (url.length > 0) {
        localStorage.setItem("videoSize", "URL");
        localStorage.setItem("videoPath", url);
    }
}