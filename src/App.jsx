import React, { useState, useEffect, useRef, useCallback } from 'react';

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = remainingSeconds.toString().padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
}

// Main App Component
function App() {
    // --- State Variables ---
    const currentSongRef = useRef(new Audio());
    const [currentFolder, setCurrentFolder] = useState('');
    const [songs, setSongs] = useState([]);
    const [currentSongInfo, setCurrentSongInfo] = useState('Select a song'); // Default message
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.1);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Function to fetch songs in a given folder
    const getSongs = useCallback(async (folderPath) => {
        setCurrentFolder(folderPath);

        try {
            const response = await fetch(`${import.meta.env.BASE_URL}${folderPath}/songlist.json`);
            if (!response.ok) {
                console.error(`Error fetching songlist.json from ${import.meta.env.BASE_URL}${folderPath}/songlist.json: ${response.statusText}`);
                setSongs([]);
                return [];
            }
            const fetchedSongs = await response.json();
            setSongs(fetchedSongs);
            return fetchedSongs;
        } catch (error) {
            console.error("Network or parsing error fetching songs:", error);
            setSongs([]);
            return [];
        }
    }, []);

    // Function to play or load music
    const playMusic = useCallback((track, folderToPlayFrom = currentFolder, pause = false, shouldLoadOnly = false) => {
        if (!track) {
            currentSongRef.current.pause();
            currentSongRef.current.src = "";
            setIsPlaying(false);
            setCurrentSongInfo("No song loaded");
            return;
        }

        const basePath = `${import.meta.env.BASE_URL}${folderToPlayFrom}/`;
        const newSrc = basePath + track;

        if (currentSongRef.current.src !== newSrc) {
            currentSongRef.current.pause();
            currentSongRef.current.src = newSrc;
            currentSongRef.current.load();
            setIsPlaying(false);
        }

        if (!shouldLoadOnly && !pause) {
            const audio = currentSongRef.current;
            const handleCanPlay = () => {
                audio.play().then(() => {
                    setIsPlaying(true);
                }).catch(error => {
                    console.warn("Playback prevented or error after canplay:", error.name, error.message);
                    setIsPlaying(false);
                });
                audio.removeEventListener('canplay', handleCanPlay);
            };

            audio.addEventListener('canplay', handleCanPlay);
            if (audio.readyState >= 3) {
                handleCanPlay();
            }
        } else if (pause) {
            currentSongRef.current.pause();
            setIsPlaying(false);
        } else if (shouldLoadOnly) {
            setIsPlaying(false);
        }

        setCurrentSongInfo(decodeURI(track));
    }, [currentFolder]);

    // Audio time update listener and ended listener
    useEffect(() => {
        const audio = currentSongRef.current;

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            setDuration(audio.duration || 0);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            const currentTrackFilename = decodeURIComponent(audio.src.split('/').pop());
            let index = songs.indexOf(currentTrackFilename);

            if ((index + 1) < songs.length) {
                playMusic(songs[index + 1], currentFolder);
            } else {
                setIsPlaying(false);
                setCurrentTime(0);
                setDuration(0);
                if (songs.length > 0) {
                    playMusic(songs[0], currentFolder, true, true);
                }
            }
        };

        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("ended", handleEnded);
        };
    }, [songs, playMusic, currentFolder]);

    // Play/Pause button handler
    const handlePlayPauseClick = () => {
        if (!currentSongRef.current.src && songs.length > 0) {
             playMusic(songs[0], currentFolder);
        } else if (currentSongRef.current.paused || currentSongRef.current.ended) {
            currentSongRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(error => {
                console.warn("Manual Playback prevented or error:", error.name, error.message);
            });
        } else {
            currentSongRef.current.pause();
            setIsPlaying(false);
        }
    };

    // Previous song button handler
    const handlePreviousClick = () => {
        currentSongRef.current.pause();
        const currentTrackFilename = decodeURIComponent(currentSongRef.current.src.split("/").pop());
        let index = songs.indexOf(currentTrackFilename);
        if ((index - 1) >= 0) {
            playMusic(songs[index - 1], currentFolder);
        }
    };

    // Next song button handler
    const handleNextClick = () => {
        currentSongRef.current.pause();
        const currentTrackFilename = decodeURIComponent(currentSongRef.current.src.split("/").pop());
        let index = songs.indexOf(currentTrackFilename);
        if ((index + 1) < songs.length) {
            playMusic(songs[index + 1], currentFolder);
        } else {
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
            if (songs.length > 0) {
                playMusic(songs[0], currentFolder, true, true);
            }
        }
    };

    // Seekbar click handler
    const handleSeekbarClick = (e) => {
        const seekbar = e.currentTarget;
        let percent = (e.nativeEvent.offsetX / seekbar.getBoundingClientRect().width) * 100;
        if (currentSongRef.current.duration) {
            currentSongRef.current.currentTime = (currentSongRef.current.duration * percent) / 100;
        }
    };

    // Volume range handler
    const handleVolumeChange = (e) => {
        const newVolume = parseInt(e.target.value) / 100;
        currentSongRef.current.volume = newVolume;
        setVolume(newVolume);
    };

    // Mute/Unmute handler
    const handleToggleMute = () => {
        if (currentSongRef.current.volume === 0) {
            currentSongRef.current.volume = 0.1;
            setVolume(0.1);
        } else {
            currentSongRef.current.volume = 0;
            setVolume(0);
        }
    };

    // Card click handler (to load new playlist)
    const handleCardClick = useCallback(async (folderNumber) => {
        const folderPath = `songs/${folderNumber}`;
        const newSongs = await getSongs(folderPath);

        if (newSongs.length > 0) {
            playMusic(newSongs[0], folderPath);
        } else {
            playMusic("", "", true, true);
            setCurrentSongInfo('No songs in this playlist');
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
        }
    }, [getSongs, playMusic]);

    // Hamburger menu toggle
    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="container flex bg-black">
            <div className={`left ${isSidebarOpen ? '' : 'left-hidden'}`}>
                <div className="close invert" onClick={toggleSidebar}>
                    <img src="/svgs/close.svg" alt="" />
                </div>
                <div className="home bg-grey rounded m-1 p-1">
                    <div><img className="invert logo" src="/svgs/logo.svg" alt="logo" /></div>
                    <ul>
                        <li><img className="invert" src="/svgs/home.svg" alt="home" />Home</li>
                        <li><img className="invert" src="/svgs/search.svg" alt="search" />Search</li>
                    </ul>
                </div>
                <div className="library bg-grey rounded m-1 p-1">
                    <div className="heading flex">
                        <img className="invert" src="/svgs/library.svg" alt="library" />
                        <h2>Your Library</h2>
                    </div>
                    <div className="songList">
                        <ul>
                            {songs.length > 0 ? (
                                songs.map((song, index) => (
                                    <li key={index} onClick={() => playMusic(song, currentFolder)}>
                                        <img id="playjoe" className="invert" src="/svgs/play.svg" alt="" />
                                        <div className="info">
                                            <div>
                                                {song.replaceAll("%20", " ")
                                                     .replaceAll("%EB", "")
                                                     .replaceAll("%86", "")
                                                     .replaceAll("%ED", "")
                                                     .replaceAll("%E3", "")
                                                     .replaceAll("%85", "")
                                                     .replaceAll("%B0%A9%83%84%EC%8C%84", " ")
                                                     .replaceAll(" %8B%A8", "")
                                                     .replaceAll("%82%B1%82%A4 %83%AA%82%BF%83%BC%83%B3 %82%AA%83%95", "")
                                                     .replaceAll("%82%AD%83%B3%82%B0", "")}
                                            </div>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li>No songs available.</li>
                            )}
                        </ul>
                    </div>
                    <div className="footer">
                        <div><a href="https://www.spotify.com/in-en/legal/">Legal</a></div>
                        <div><a href="https://www.spotify.com/in-en/safetyandprivacy/">Safety & Privacy Center</a></div>
                        <div><a href="https://www.spotify.com/in-en/legal/privacy-policy/">Privacy Policy</a></div>
                        <div><a href="https://www.spotify.com/in-en/legal/cookies-policy/">Cookies</a></div>
                        <div><a href="https://www.spotify.com/in-en/legal/privacy-policy/#s3">About Ads</a></div>
                        <div><a href="https://www.spotify.com/in-en/accessibility/">Accessibility</a></div>
                    </div>
                </div>
            </div>

            <div className="right bg-grey rounded">
                <div className="header bg-black">
                    <div className="nav">
                        <div className="hamburger invert" onClick={toggleSidebar}>
                            <img src="/svgs/hamburger.svg" alt="" />
                        </div>
                        <img className="invert" src="/images/math-mathematical-expression-less-than-128.webp" alt="arrow" />
                        <img className="invert" src="/images/math-mathematical-expression-greater-than-128.webp" alt="arrow" />
                    </div>
                    <div className="buttons">
                        <button className="blend">Sign Up</button>
                        <button className="login">Log in</button>
                    </div>
                </div>

                <div className="playlists">
                    <h1>Spotify Playlists</h1>
                    <div className="cardContainer">
                        <div data-folder="1" className="card" onClick={() => handleCardClick('1')}>
                            <div className="play">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" id="play"
                                    viewBox="0 0 32 32">
                                    <circle cx="16" cy="16" r="14" fill="#00FF00" />
                                    <path fill="#000" d="M11 21.259V10.741a1 1 0 0 1 1.504-.864l9.015 5.26a1 1 0 0 1 0 1.727l-9.015 5.259A1 1 0 0 1 11 21.259Z" />
                                </svg>
                            </div>
                            <img aria-hidden="false" draggable="false" loading="lazy"
                                src="https://i.scdn.co/image/ab67706f00000002a6a35d85da2b230f63a0005a"
                                data-testid="card-image" alt=""
                                className="mMx2LUixlnN_Fu45JpFB yMQTWVwLJ5bV8VGiaqU3 yOKoknIYYzAE90pe7_SE Yn2Ei5QZn19gria6LjZj" />
                            <h3>The perfect soundtrack to those long nights over dinner</h3>
                        </div>
                        <div data-folder="2" className="card" onClick={() => handleCardClick('2')}>
                            <div className="play">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" id="play"
                                    viewBox="0 0 32 32">
                                    <circle cx="16" cy="16" r="14" fill="#00FF00" />
                                    <path fill="#000" d="M11 21.259V10.741a1 1 0 0 1 1.504-.864l9.015 5.26a1 1 0 0 1 0 1.727l-9.015 5.259A1 1 0 0 1 11 21.259Z" />
                                </svg>
                            </div>
                            <img aria-hidden="false" draggable="false" loading="lazy"
                                src="/images/ab67706f00000002e33921151f34f084b36d4480.jpg" data-testid="card-image" alt=""
                                className="mMx2LUixlnN_Fu45JpFB yMQTWVwLJ5bV8VGiaqU3 yOKoknIYYzAE90pe7_SE Yn2Ei5QZn19gria6LjZj" />
                            <h3>Songs to chill to on a rainy night</h3>
                        </div>
                    </div>
                </div>

                {/* Playbar */}
                <div className="playbar">
                    <div className="abovebar">
                        <div className="songinfo">
                            {currentSongInfo}
                        </div>
                        <div className="navigation">
                            <img id="previous" className="invert" src="/svgs/prev-song.svg" alt="prev" onClick={handlePreviousClick} />
                            <img id="play_btn" className="invert" src={isPlaying ? "/svgs/pause.svg" : "/svgs/play.svg"} alt="play" onClick={handlePlayPauseClick} />
                            <img id="next" className="invert" src="/svgs/next-song.svg" alt="next" onClick={handleNextClick} />
                        </div>
                        <div className="timeandvol">
                            <div className="songtime">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </div>
                            <div className="volume">
                                <img
                                    className="invert"
                                    src={volume === 0 ? "/svgs/mute.svg" : "/svgs/volume.svg"}
                                    alt="volume"
                                    onClick={handleToggleMute}
                                />
                                <div className="range">
                                    <input
                                        type="range"
                                        name="range"
                                        min="0"
                                        max="100"
                                        value={volume * 100}
                                        onChange={handleVolumeChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="seekbar" onClick={handleSeekbarClick}>
                        <div className="circle" style={{ left: `${(currentTime / duration) * 100 || 0}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;