

(async function fetchSongs(){
    const res = await fetch("http://localhost:3000/songs", { method: "GET" });
    
    const songs = await res.json();
    
    const generatedHtml = songs.map(function (song, index) {
        return `<p data-link="${song.path}" id="song" onclick="setSong(this)" data-index="${index}">${song.name}</p>`
    }).join("");
    
    console.log(generatedHtml);
    
    const songDispqlyer = document.querySelector(".songlist");
    songDispqlyer.innerHTML += generatedHtml;
})();

var FREQ_MIN = 20;
const ctx = new (window.AudioContext || window.webkitAudioContext)();
var FREQ_MAX = Math.round(ctx.sampleRate * 0.5);

var MAG_MIN = -20;
var MAG_MAX = 20;
var FREQS_NUM = 200;
//////////////////////////////////////////////////////////////

const playBtn = document.getElementById("playbtn");
const audioElement = document.getElementById("myaudio");



const track = ctx.createMediaElementSource(audioElement);
const gainNode = ctx.createGain();
const analyser = ctx.createAnalyser();
const compressor = ctx.createDynamicsCompressor();

var nodes = createNodes();
gainNode.gain.value = 1;


track.connect(gainNode)
.connect(nodes[0])
.connect(nodes[nodes.length-1])
.connect(analyser)
.connect(ctx.destination);



/////////////////////////////////////////////////////////////////
var drawVisual;
function visualize(){
analyser.fftSize = 2048;
const bufferLen = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLen);


var canvas2ctx = document.querySelector("#canv2").getContext("2d");
var widtH = canvas2ctx.canvas.width;
var heigHt = canvas2ctx.canvas.height;
canvas2ctx.clearRect(0,0,widtH,heigHt);



function draw(){
    drawVisual = requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);
    //analyser.getByteFrequencyData(dataArray);
    //console.log(dataArray);

    const colours = ["azure", 
    "brown", "grey", "peru","red",
     "black", "green", "yellow","blue",
      "violet", "pink", "beige", "white"];

    canvas2ctx.fillStyle = "white";
    canvas2ctx.fillRect(0,0,widtH,heigHt);
    canvas2ctx.lineWidth = Math.random() * 5;
    canvas2ctx.strokeStyle = colours[Math.floor(Math.random() * colours.length)];

    canvas2ctx.beginPath();

    var sliceWidth = widtH/bufferLen;
    let x = 0;

    for(let i = 0; i < bufferLen; i++){

        const v = dataArray[i]/128.0;
        const y = (v * heigHt)/2;

        if(i === 0){
            canvas2ctx.moveTo(x,y);
        } else {
            canvas2ctx.lineTo(x,y)
        }

        x += sliceWidth;

    }


    canvas2ctx.lineTo(widtH, heigHt/2);
    canvas2ctx.stroke();
    }


draw();
}
///////////////////////////////////////////////////////////////////


function vol(e)
{
    gainNode.gain.value = e.value;
}

var currentTrack = 0;
const sonlist = document.querySelector(".songlist");
const currentSong = document.querySelector(".currentSong");
const playButtons = document.querySelectorAll(".playbtn");

function playTrack(e)
{
    if(audioElement.src === ""){
       audioElement.src = document.querySelector(".songlist").children[currentTrack].dataset.link;
        
        songlist.children[currentTrack].classList.add("active");
        currentSong.innerText = document.querySelector(".songlist").children[currentTrack].innerText;
    }

    //audioElement.src = document.querySelector(".songlist").children[currentTrack].dataset.link;
    if(ctx.state === "suspended"){
        ctx.resume();
    }

    if(playBtn.dataset.playing === "false"){
        audioElement.play();
        playBtn.dataset.playing = "true";
        //e.innerText = "pause";
        playButtons.forEach((item)=>{
            item.innerText = "pause";
        });
        window.cancelAnimationFrame(drawVisual);
        visualize();
    }else if(playBtn.dataset.playing === "true"){
        audioElement.pause();
        playBtn.dataset.playing = "false";
        //e.innerText = "play";
        document.querySelectorAll(".playbtn").forEach((item)=>{
             item.innerText = "play";
        });
    }

    //console.log(playBtn.dataset.playing);
}



function createNodes()
{
    var firstInterval = 20;

    var centers = new Array();

    for (let expo = 0;((firstInterval*(2**(expo + 1)))) < (ctx.sampleRate * 0.5);expo++)
    {
        centers.push(((firstInterval*(2**expo)) + (firstInterval*(2**(expo + 1)))) * (1/2));
    }

    //console.log(centers);

    var nodes = new Array();
    centers.forEach((center,index)=>
    {
        var node = ctx.createBiquadFilter();
        node.frequency.value = center;
        node.gain.value = 0;
        //Math.floor((Math.random() * 5));

        if(index === 0){
            node.type = "lowshelf";
        }else if(index === centers.length-1){
            node.type = "highshelf";
        }else{
            node.type = "peaking";
        }
        nodes.push(node);
    });




    //console.log(nodes);
    //createCordinates(nodes);
    //updateEQGraphics();
    return nodes;
}

const sliders = document.getElementById("sliders");

(function drawSliders(){
    var nodes = createNodes();
    var i;
    sliders.innerHTML += '<input id="vol" type="range" min="0" max="1" onInput="vol(this)" step="0.01" input orient="vertical" class="slider vol"/>';

    for(i = 0; i < nodes.length-1; i++)
    {
        nodes[i].connect(nodes[i+1]);
        sliders.innerHTML += `<input orient="vertical" class="slider" onInput="varyFreq(this)" id="bass" type="range" min="-30" max="30" step="0.001" value="0" data-number="${i}"/>`;

    }

    sliders.innerHTML += `<input orient="vertical" class="slider" onInput="varyFreq(this)" id="bass" type="range" min="-30" max="30" step="0.001" value="0" data-number="${i}"/>`;

})();
//////////////////////////////////////////

//////////////////////////////////////////

function createCordinates(nodes)
{
    var FREQ_MIN = 20;
    var FREQ_MAX = Math.round(ctx.sampleRate * 0.5);

    var MAG_MIN = -20;
    var MAG_MAX = 20;
    var FREQS_NUM = 200;

///////////////////////////////////////////////////////////////////////////////////

    var freq_step = (FREQ_MAX - FREQ_MIN)/FREQS_NUM;
    var mag = new Float32Array(FREQS_NUM);
    var phase =new Float32Array(FREQS_NUM);

    var combo = new Float32Array(FREQS_NUM);
    var freqs = new Float32Array(FREQS_NUM);


    for(let i = 0; i < FREQS_NUM;i++){
        freqs[i] = FREQ_MIN + (i*freq_step);
    }


    for(let i = 0; i < nodes.length;i++){
        nodes[i].getFrequencyResponse(
            freqs,
            mag,
            phase
        );

        for(let j = 0; j < freqs.length; j++){
            var magDb = Math.log(mag[j]) * 5 ;//* 20;
            combo[j] += magDb;
        }
    }



    //console.log(ctx.sampleRate * 0.5,combo);

    return [combo,freqs];



}


function updateEQGraphics(){
    //createCordinates(nodes);
var canvctx = document.querySelector("#canv2").getContext("2d");
var canvWidth = canvctx.canvas.width;
var canvHeight = canvctx.canvas.height;

var stepX = canvWidth / (FREQ_MAX - FREQ_MIN);
var stepY = canvHeight / (MAG_MAX - MAG_MIN);

canvctx.fillStyle = "black";
canvctx.fillRect(0,0,canvWidth,canvHeight);
var [magnitude, freqs] = createCordinates(nodes);

var firstPt = true;
canvctx.beginPath();

for(let index = 0; index < freqs.length; index++){
    var x = Math.round((freqs[index] - FREQ_MIN) * stepX);
    var y =canvHeight - (Math.round((magnitude[index] - MAG_MIN) * stepY));

    console.log("xy",x,y);

    if(firstPt){
        firstPt = false;
        canvctx.moveTo(x,y);
    }else{
        canvctx.lineTo(x,y);
        //console.log("hhhh");
    }
}

canvctx.strokeStyle = "green";
canvctx.stroke();

var neutralY = canvHeight - Math.round((0 - MAG_MIN)*stepY);
canvctx.beginPath();
canvctx.moveTo(0,neutralY);
canvctx.lineTo(canvWidth,neutralY);

canvctx.strokeStyle = "white";
canvctx.stroke();

};



function varyFreq(slider)
{
    nodes[slider.dataset.number].gain.value = slider.value;
    updateEQGraphics();

}

const settingsBtn = document.querySelector(".settings");
const player = document.querySelector(".player");
const home = document.querySelector(".home");

function showSettings(){
    settingsBtn.style.display = "block";
    player.style.display = "none";
    home.style.display = "none"
}

function showHome(){
    settingsBtn.style.display = "none";
    player.style.display = "none";
    home.style.display = "block"
}

function showPlayer(){
    settingsBtn.style.display = "none";
    player.style.display = "block";
    home.style.display = "none"
}

var currentP;
function setSong(x){
    currentTrack = x.dataset.index;
    audioElement.src = x.dataset.link;
    setActive();
    playButtons.forEach((item)=>{
           item.innerText = "pause";
    });
}


function setActive(){
    ctx.resume();
    audioElement.play();
    visualize();
    for(let i = 0; i< (sonlist.children).length; i++){
        (sonlist.children)[i].classList.remove("active");
    }
    sonlist.children[currentTrack].classList.add("active");
    currentSong.innerText = sonlist.children[currentTrack].innerText;
}


function setPrevious(){
    //document.querySelector(".currentSong").innerText =
    if(!sonlist.children[currentTrack-1]){
        audioElement.src = sonlist.children[sonlist.children.length-1].dataset.link;
        currentTrack = sonlist.children.length-1;
    }else{
        audioElement.src = sonlist.children[currentTrack-1].dataset.link;
        currentTrack--;
    }
    setActive();
}

function setForward(){
        if(!sonlist.children[currentTrack+1]){
            audioElement.src = sonlist.children[0].dataset.link;
            currentTrack = 0;
        }else{
            audioElement.src = sonlist.children[currentTrack+1].dataset.link;
            currentTrack++;
        }
        setActive();
}

var buttons = document.querySelectorAll(".cbutton");

buttons.forEach((button)=>{
    button.addEventListener("click",(e)=>{
        e.stopPropagation();
    });
});