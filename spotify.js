let currentSong = new Audio();//declaring it to change it afterwards
let currFolder;

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = remainingSeconds.toString().padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

async function getSongs(folder) {
    //fetching the name of songs
    currFolder = folder;
    let a = await fetch(`http://127.0.0.1:3000/${folder}`)
    console.log(`Fetching songs from: http://127.0.0.1:3000/${folder}`);

    let response = await a.text()
    console.log(response)
    let div = document.createElement("div")
    div.innerHTML = response;
    let as = div.getElementsByTagName("a")
    let songs = []
    for (let index = 0; index < as.length; index++) {
        const element = as[index];
        if (element.href.endsWith(".mp3")) {
            //pushing names of songs(ending with ".mp3") into songs array after splitting it from its folder and its name
            songs.push(element.href.split(`/${folder}/`)[1])
        }
    }

    //making and inserting cards for all songs with name through updating innerHTML (DOM)
    let songUL = document.querySelector(".songList").getElementsByTagName("ul")[0]
    songUL.innerHTML="";
    for (const song of songs) {
        songUL.innerHTML = songUL.innerHTML + `<li> <img id="playjoe" class="invert" src="svgs/play.svg" alt="">
            <div class="info">
                <div>${song.replaceAll("%20", " ").replaceAll("%EB", "",).replaceAll("%86", "",).replaceAll("%ED", "",).replaceAll("%E3", "",).replaceAll("%85", "",).replaceAll("%B0%A9%83%84%EC%8C%84", " ").replaceAll(" %8B%A8", "").replaceAll("%82%B1%82%A4 %83%AA%82%BF%83%BC%83%B3 %82%AA%83%95", "").replaceAll("%82%AD%83%B3%82%B0", "")}</div>
            </div>
    
            </li>`;

    }

    //getting the name of songs from song info one by one and adding event on it so that after clicking it triggers function playmusic
    Array.from(document.querySelector(".songList").getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", element => {
            playmusic(e.querySelector(".info").firstElementChild.innerHTML)
        })
    })

    return songs;
}

const playmusic = (track, pause = false) => {
    //function playmusic to play the music and by changing source of global variable currentSong we make sure one song plays at one time
    currentSong.src = `/${currFolder}/` + track
    if (!pause) {
        currentSong.play()
        playmama.src = "svgs/pause.svg"
    }
    document.querySelector(".songinfo").innerHTML = decodeURI(track);
    document.querySelector(".songtime").innerHTML = "0:00 / 0:00";
}

async function main() {

    //getting name of songs
    let songs = await getSongs("songs/1")
    playmusic(songs[0], true)

    //displaying all albums on the page


    //Attach event listener to prev,play,next buttons
    playmama = document.getElementById("play_btn")
    playmama.addEventListener("click", (e) => {
        if (currentSong.paused) {
            currentSong.play()
            playmama.src = "svgs/pause.svg"
        }
        else {
            currentSong.pause()
            playmama.src = "svgs/play.svg"
        }
    })

    previous.addEventListener("click", () => {
        currentSong.pause();
        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
        if ((index - 1) >= 0) {
            playmusic(songs[index - 1])
        }
    })

    next.addEventListener("click", () => {
        currentSong.pause();
        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
        if ((index + 1) <= songs.length - 1) {
            playmusic(songs[index + 1])
        }
    })

    //listening to timeupdate
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML = `${formatTime(currentSong.currentTime)} / ${formatTime(currentSong.duration)}`
        document.querySelector(".circle").style.left = 100 * (currentSong.currentTime / currentSong.duration) + "%";
    })

    //listening event for seekbar
    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100
        document.querySelector(".circle").style.left = percent + "%"
        currentSong.currentTime = ((currentSong.duration) * percent) / 100;
    })

    //event for hamburger
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    })

    //event for close button
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    })

    //event for volume
    document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
        currentSong.volume = parseInt(e.target.value) / 100
    })

    //load playlist whenever card is clicked
    Array.from(document.getElementsByClassName("card")).forEach((e) => {
        e.addEventListener("click", async item => {
            songs = await getSongs(`songs/${item.currentTarget.dataset.folder}`)
            playmusic(songs[0])
        })
    })

    //adding event to mute song
    document.querySelector(".volume>img").addEventListener("click",(e)=>{
        if(e.target.src.includes("volume.svg")){
            e.target.src = e.target.src.replace("svgs/volume.svg","svgs/mute.svg")
            currentSong.volume = 0;
            document.querySelector(".range").getElementsByTagName("input")[0].value=0;
        }else{
            e.target.src = e.target.src.replace("svgs/mute.svg","svgs/volume.svg")
            currentSong.volume=0.1;
            document.querySelector(".range").getElementsByTagName("input")[0].value=10;
        }
    })

    
}

main()