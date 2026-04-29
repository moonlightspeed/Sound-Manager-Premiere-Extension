document.addEventListener("DOMContentLoaded", function () {
  let csInterface;
  try {
    csInterface = new CSInterface();
  } catch (err) {
    alert("CSInterface Initialization Failed!");
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = "loading-overlay";
  overlay.innerHTML = `<div id="loading-text">Processing...</div><div class="progress-container"><div class="progress-bar" id="loading-progress"></div></div>`;
  document.body.appendChild(overlay);
  const loadingText = document.getElementById("loading-text");
  const loadingProgress = document.getElementById("loading-progress");

  const ctxMenu = document.createElement("div");
  ctxMenu.className = "context-menu";
  ctxMenu.innerHTML = `<div id="m-explorer">Reveal in Explorer</div><div id="m-rename">Rename Sound</div><div id="m-similar">Find Similar Sounds</div><div id="m-clear">Clear Usage Data</div><div id="m-clear-tags">Clear All Tags</div>`;
  document.body.appendChild(ctxMenu);
  window.addEventListener("click", () => (ctxMenu.style.display = "none"));

  let sfxDatabase = JSON.parse(localStorage.getItem("sfx_db")) || {};
  let settings = JSON.parse(localStorage.getItem("sfx_settings")) || {
    folders: [],
    showTags: true,
    showSeq: true,
    showSeqTime: true,
    showAllFiles: false,
  };

  function saveDB() {
    localStorage.setItem("sfx_db", JSON.stringify(sfxDatabase));
  }
  function saveSettings() {
    localStorage.setItem("sfx_settings", JSON.stringify(settings));
  }

  function updateAudioTracks() {
    csInterface.evalScript("getAvailableAudioTracks()", (res) => {
      if (!res || res.startsWith("ERR:")) return;
      try {
        const tracks = res.split(",");
        const trackSelect = document.getElementById("track-val");
        if (!trackSelect) return;
        const currentVal = trackSelect.value;
        trackSelect.innerHTML = "";
        if (tracks.length === 0 || tracks[0] === "") {
          trackSelect.innerHTML = '<option value="">(Empty)</option>';
        } else {
          tracks.forEach((t) => {
            const opt = document.createElement("option");
            opt.value = t;
            opt.innerText = t;
            trackSelect.appendChild(opt);
          });
          if (tracks.includes(currentVal)) trackSelect.value = currentVal;
        }
      } catch (e) {}
    });
  }
  setInterval(updateAudioTracks, 2000);
  updateAudioTracks();

  function formatTime(secs) {
    if (isNaN(secs)) return "00:00";
    let m = Math.floor(secs / 60);
    let s = Math.floor(secs % 60);
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function formatSequenceDisplay(seqArray, fileName) {
    if (!seqArray || seqArray.length === 0) return "";
    return seqArray
      .map((s) => {
        const parts = s.split("|");
        const seqName = parts[0];
        const timeStr = parts[1] || "00:00";
        const displayStr = settings.showSeqTime
          ? `${seqName} (${timeStr})`
          : seqName;
        return `<span class="jump-link" data-seq="${seqName}" data-time="${timeStr}" data-file="${fileName}" style="cursor:pointer; text-decoration:underline;" title="Jump to ${timeStr}">${displayStr}</span>`;
      })
      .join(", ");
  }

  let activeWavesurfers = [];
  const searchInput = document.getElementById("search-input");
  const filterSort = document.getElementById("filter-sort");

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loadSoundsAndRender(false, searchInput.value);
    }
  });
  searchInput.addEventListener("input", () => {
    if (searchInput.value === "")
      searchInput.placeholder = 'Search... e.g., wind, tag:"sun, rain"';
  });

  // GỌI HÀM LỌC KHI ĐỔI DROPDOWN
  if (filterSort) {
    filterSort.addEventListener("change", () => {
      loadSoundsAndRender(false, searchInput.value);
    });
  }

  const githubBtn = document.getElementById("github-btn");
  if (githubBtn) {
    githubBtn.addEventListener("click", () => {
      window.cep.util.openURLInDefaultBrowser(
        "https://github.com/moonlightspeed/Sound-Manager-Extension-for-Premiere",
      );
    });
  }

  // TÍNH NĂNG CUỘN LÊN ĐẦU
  const btnScrollTop = document.getElementById("btn-scroll-top");
  if (btnScrollTop) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) btnScrollTop.classList.add("visible");
      else btnScrollTop.classList.remove("visible");
    });
    btnScrollTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function loadSoundsAndRender(
    showLoadingScreen = false,
    searchTerm = "",
    similarToPath = "",
  ) {
    const listContainer = document.getElementById("sfx-list");
    activeWavesurfers.forEach((item) => item.ws.destroy());
    activeWavesurfers = [];
    listContainer.innerHTML = "";

    let allSounds = [];
    if (window.cep && window.cep.fs) {
      settings.folders.forEach((folder) => {
        let safeFolder = folder.replace(/\\/g, "/");
        if (!safeFolder.endsWith("/")) safeFolder += "/";
        const result = window.cep.fs.readdir(safeFolder);
        if (result.err === window.cep.fs.NO_ERROR) {
          result.data.forEach((file) => {
            if (
              file.toLowerCase().endsWith(".wav") ||
              file.toLowerCase().endsWith(".mp3")
            ) {
              allSounds.push({ name: file, path: safeFolder + file });
            }
          });
        }
      });
    }

    if (allSounds.length === 0) {
      listContainer.innerHTML =
        '<p style="text-align:center; color:#aaa; margin-top:20px;">Directory is empty. Please add a path in Settings.</p>';
      return;
    }

    let filteredSounds = allSounds;
    const rawTerm = searchTerm.toLowerCase().trim();

    if (similarToPath) {
      const targetNameRaw = similarToPath.split("/").pop();
      const targetName = targetNameRaw.toLowerCase().replace(/\.[^/.]+$/, "");
      const targetWords = targetName
        .split(/[\s_\-]+/)
        .filter((w) => w.length > 2);
      const targetTags = (sfxDatabase[similarToPath]?.tags || []).map((t) =>
        t.toLowerCase(),
      );

      let scoredSounds = allSounds.map((sound) => {
        const sPath = sound.path.replace(/\\/g, "/");
        if (sPath === similarToPath) return { ...sound, score: -1 };
        let score = 0;
        const sName = sound.name.toLowerCase().replace(/\.[^/.]+$/, "");
        const sWords = sName.split(/[\s_\-]+/);
        const sTags = (sfxDatabase[sPath]?.tags || []).map((t) =>
          t.toLowerCase(),
        );

        targetTags.forEach((t) => {
          if (sTags.includes(t)) score += 10;
        });
        targetWords.forEach((w) => {
          if (sWords.includes(w)) score += 2;
        });
        return { ...sound, score };
      });
      filteredSounds = scoredSounds
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);
      searchInput.value = "";
      searchInput.placeholder = `Showing sounds similar to: ${targetNameRaw}...`;
    } else if (rawTerm !== "") {
      let nameTerm = rawTerm;

      const extractQuotes = (prefix, str) => {
        const regex = new RegExp(`${prefix}:"([^"]+)"`, "gi");
        let matches = [];
        let match;
        while ((match = regex.exec(str)) !== null) {
          matches.push(
            ...match[1]
              .split(",")
              .map((m) => m.trim().toLowerCase())
              .filter(Boolean),
          );
        }
        return { matches, cleanStr: str.replace(regex, "").trim() };
      };

      const parsedTag = extractQuotes("tag", nameTerm);
      const tagTerms = parsedTag.matches;
      nameTerm = parsedTag.cleanStr;
      const parsedOnly = extractQuotes("only", nameTerm);
      const onlyTerms = parsedOnly.matches;
      nameTerm = parsedOnly.cleanStr;
      const parsedExp = extractQuotes("exp", nameTerm);
      const expTerms = parsedExp.matches;
      nameTerm = parsedExp.cleanStr;
      const nameTerms = nameTerm
        .split(",")
        .map((n) => n.trim())
        .filter((n) => n);

      filteredSounds = allSounds.filter((sound) => {
        const safePath = sound.path.replace(/\\/g, "/");
        const fileTags = (sfxDatabase[safePath]?.tags || []).map((t) =>
          t.toLowerCase(),
        );
        const fileName = sound.name.toLowerCase();
        const baseName = fileName.replace(/\.[^/.]+$/, "");

        // EXP: Loại trừ
        if (expTerms.length > 0) {
          const hasExp = expTerms.some(
            (e) =>
              fileName.includes(e) || fileTags.some((ft) => ft.includes(e)),
          );
          if (hasExp) return false;
        }

        // ONLY: Tìm chính xác 100%
        if (onlyTerms.length > 0) {
          const isOnly = onlyTerms.some(
            (o) => baseName === o || fileTags.includes(o),
          );
          if (!isOnly) return false;
        }

        // TAG: Chứa tag
        if (tagTerms.length > 0) {
          const hasTag = tagTerms.some((tt) =>
            fileTags.some((ft) => ft.includes(tt)),
          );
          if (!hasTag) return false;
        }

        // NAME: Tên thông thường
        if (nameTerms.length > 0) {
          const hasName = nameTerms.some((nt) => fileName.includes(nt));
          if (!hasName) return false;
        }

        return true;
      });
    }

    // 2. LỌC VÀ SẮP XẾP QUA DROPDOWN (Filter & Sort)
    const filterVal = filterSort ? filterSort.value : "all";
    if (filterVal === "fav") {
      filteredSounds = filteredSounds.filter(
        (s) => sfxDatabase[s.path.replace(/\\/g, "/")]?.fav,
      );
    }
    if (filterVal === "az") {
      filteredSounds.sort((a, b) => a.name.localeCompare(b.name));
    } else if (filterVal === "za") {
      filteredSounds.sort((a, b) => b.name.localeCompare(a.name));
    } else if (filterVal === "uses") {
      filteredSounds.sort(
        (a, b) =>
          (sfxDatabase[b.path.replace(/\\/g, "/")]?.uses || 0) -
          (sfxDatabase[a.path.replace(/\\/g, "/")]?.uses || 0),
      );
    }

    // 3. GIỚI HẠN HIỂN THỊ
    if (
      !settings.showAllFiles &&
      rawTerm === "" &&
      filterVal === "all" &&
      !similarToPath
    ) {
      filteredSounds = filteredSounds.slice(0, 15);
    }

    if (filteredSounds.length === 0) {
      listContainer.innerHTML =
        '<p style="text-align:center; color:#aaa; margin-top:20px;">No results found.</p>';
      if (similarToPath)
        searchInput.placeholder = 'Search... e.g., wind, tag:"sun, rain"';
      return;
    }

    if (showLoadingScreen) {
      overlay.style.display = "flex";
      loadingText.innerText = `Loading ${filteredSounds.length} files...`;
      loadingProgress.style.width = "0%";
    } else {
      overlay.style.display = "none";
    }

    filteredSounds.forEach((sound, index) => {
      let safePath = sound.path.replace(/\\/g, "/"); // BẮT BUỘC LÀ LET ĐỂ CÓ THỂ UPDATE KHI RENAME
      if (!sfxDatabase[safePath]) {
        sfxDatabase[safePath] = {
          tags: [],
          uses: 0,
          fav: false,
          sequences: [],
        };
      }
      if (!Array.isArray(sfxDatabase[safePath].sequences))
        sfxDatabase[safePath].sequences = [];
      const dbData = sfxDatabase[safePath];
      const waveId = "wave-" + index;

      const item = document.createElement("div");
      item.className = "sfx-item";
      let tagsHTML = "";
      dbData.tags.forEach((t) => {
        tagsHTML += `<span class="tag-badge">${t} <i class="fas fa-times tag-delete" data-path="${safePath}" data-tag="${t}"></i></span>`;
      });

      const seqHtml =
        settings.showSeq && dbData.sequences.length > 0
          ? `<span class="sfx-sequence" id="seq-${index}">(In: <span id="seq-list-${index}">${formatSequenceDisplay(dbData.sequences, sound.name)}</span>)</span>`
          : `<span class="sfx-sequence" id="seq-${index}" style="display:none;">(In: <span id="seq-list-${index}"></span>)</span>`;

      item.innerHTML = `
          <div class="sfx-info">
              <div class="sfx-thumb"><i class="fas fa-music"></i></div>
              <div class="sfx-details">
                  <div class="sfx-name" id="drag-name-${index}" style="cursor: grab;" title="Drag & Drop to Timeline">${sound.name}</div>
                  <p class="sfx-meta">
                      <span id="time-${index}">--:--</span> • <span id="uses-${index}">${dbData.uses}</span> usages ${seqHtml}
                  </p>
              </div>
              <div class="sfx-actions">
                  <button id="play-${index}"><i class="fas fa-play"></i></button>
                  <button id="stop-${index}"><i class="fas fa-stop"></i></button>
                  <button class="btn-add" data-path="${safePath}" id="add-${index}"><i class="fas fa-plus"></i></button>
                  <button id="more-${index}"><i class="fas fa-ellipsis-v"></i></button>
              </div>
          </div>
          <div id="${waveId}" class="waveform-container"></div>
          <div class="sfx-tags" style="display: ${settings.showTags ? "flex" : "none"}">
              <span class="tag-label">Tags:</span><span class="tag-list" id="tags-${index}">${tagsHTML}</span>
              <input type="text" class="tag-input" id="input-${index}" placeholder="+ Tag & Enter">
              <button class="btn-fav ${dbData.fav ? "active" : ""}" id="fav-${index}" title="Favorite"><i class="fas fa-star"></i></button>
          </div>
      `;
      listContainer.appendChild(item);

      const nameDrag = item.querySelector(`#drag-name-${index}`);
      nameDrag.setAttribute("draggable", "true");

      nameDrag.addEventListener("dragstart", (e) => {
        let osPath = safePath;
        if (navigator.appVersion.indexOf("Win") !== -1) {
          osPath = osPath.replace(/\//g, "\\");
        }
        e.dataTransfer.setData("com.adobe.cep.dnd.file.0", osPath);
        const img = new Image();
        img.src =
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        e.dataTransfer.setDragImage(img, 0, 0);
      });

      nameDrag.addEventListener("dragend", (e) => {
        setTimeout(() => {
          const pathForJsx = safePath.replace(/\//g, "\\\\");
          csInterface.evalScript(
            `findSequencesForFile("${pathForJsx}")`,
            (seqs) => {
              if (
                seqs &&
                !seqs.startsWith("ERR:") &&
                !seqs.startsWith("Error")
              ) {
                const seqArray = seqs.split(",").filter((s) => s.trim() !== "");
                let isNewUsageAdded = false;
                seqArray.forEach((s) => {
                  if (!sfxDatabase[safePath].sequences.includes(s)) {
                    sfxDatabase[safePath].sequences.push(s);
                    sfxDatabase[safePath].uses += 1;
                    isNewUsageAdded = true;
                  }
                });
                if (isNewUsageAdded) {
                  saveDB();
                  document.getElementById(`uses-${index}`).innerText =
                    sfxDatabase[safePath].uses;
                  if (settings.showSeq) {
                    const seqEl = document.getElementById(`seq-${index}`);
                    seqEl.style.display = "inline";
                    document.getElementById(`seq-list-${index}`).innerHTML =
                      formatSequenceDisplay(
                        sfxDatabase[safePath].sequences,
                        sound.name,
                      );
                  }
                }
              }
            },
          );
        }, 1500);
      });

      item.querySelector(`#more-${index}`).addEventListener("click", (e) => {
        e.stopPropagation();
        ctxMenu.style.display = "block";
        ctxMenu.style.top = e.pageY + "px";
        ctxMenu.style.left = e.pageX - 160 + "px";

        document.getElementById("m-explorer").onclick = () => {
          csInterface.evalScript(
            `revealFileInExplorer("${safePath.replace(/\//g, "\\\\")}")`,
          );
          ctxMenu.style.display = "none";
        };
        document.getElementById("m-similar").onclick = () => {
          ctxMenu.style.display = "none";
          loadSoundsAndRender(true, "", safePath);
        };
        document.getElementById("m-clear").onclick = () => {
          sfxDatabase[safePath].uses = 0;
          sfxDatabase[safePath].sequences = [];
          saveDB();
          document.getElementById(`uses-${index}`).innerText = "0";
          const seqBlock = document.getElementById(`seq-${index}`);
          if (seqBlock) seqBlock.style.display = "none";
          ctxMenu.style.display = "none";
        };
        document.getElementById("m-clear-tags").onclick = () => {
          sfxDatabase[safePath].tags = [];
          saveDB();
          const tagsContainer = item.querySelector(`#tags-${index}`);
          if (tagsContainer) tagsContainer.innerHTML = "";
          ctxMenu.style.display = "none";
        };

        // RENAME TẠI CHỖ (KHÔNG BỊ NHẢY)
        document.getElementById("m-rename").onclick = () => {
          ctxMenu.style.display = "none";
          const oldName = sound.name;
          const ext = oldName.substring(oldName.lastIndexOf("."));
          const baseName = oldName.substring(0, oldName.lastIndexOf("."));

          nameDrag.innerHTML = `<input type="text" id="rename-input-${index}" value="${baseName}" style="width: 100%; background: #111; color: white; border: 1px solid #555; padding: 2px; font-size: 13px;">`;
          const inputEl = document.getElementById(`rename-input-${index}`);
          inputEl.focus();
          inputEl.select();

          const finishRename = () => {
            const newBase = inputEl.value.trim();
            if (!newBase || newBase === baseName) {
              nameDrag.innerText = oldName;
              return;
            }
            const newName = newBase + ext;
            csInterface.evalScript(
              `renameFile("${safePath.replace(/\//g, "\\\\")}", "${newName}")`,
              (res) => {
                if (res === "Success") {
                  const folder = safePath.substring(
                    0,
                    safePath.lastIndexOf("/") + 1,
                  );
                  const newPath = folder + newName;

                  // Cập nhật CSDL
                  sfxDatabase[newPath] = sfxDatabase[safePath];
                  delete sfxDatabase[safePath];
                  saveDB();

                  // Ép thay đổi tại chỗ
                  nameDrag.innerText = newName;
                  sound.name = newName;
                  sound.path = newPath;
                  safePath = newPath;

                  const btnAdd = item.querySelector(".btn-add");
                  if (btnAdd) btnAdd.setAttribute("data-path", newPath);
                  const tagDeletes = item.querySelectorAll(".tag-delete");
                  tagDeletes.forEach((td) =>
                    td.setAttribute("data-path", newPath),
                  );

                  activeWavesurfers[index].safePath = newPath;
                  activeWavesurfers[index].url = "file://" + newPath;
                  activeWavesurfers[index].ws.load("file://" + newPath);
                } else {
                  alert(res);
                  nameDrag.innerText = oldName;
                }
              },
            );
          };
          inputEl.addEventListener("blur", finishRename);
          inputEl.addEventListener("keypress", (ev) => {
            if (ev.key === "Enter") {
              inputEl.removeEventListener("blur", finishRename);
              finishRename();
            }
          });
        };
      });

      const favBtn = item.querySelector(`#fav-${index}`);
      favBtn.addEventListener("click", () => {
        dbData.fav = !dbData.fav;
        saveDB();
        favBtn.classList.toggle("active", dbData.fav);
      });

      const addBtn = item.querySelector(`#add-${index}`);
      addBtn.addEventListener("click", () => {
        const targetTrack = document.getElementById("track-val").value;
        if (!targetTrack)
          return alert("Please open a Sequence and select a Target Track.");
        const pathForJsx = safePath.replace(/\//g, "\\\\");
        csInterface.evalScript(
          `importAndAddToTimeline("${pathForJsx}", "${targetTrack}")`,
          (result) => {
            if (result === "Success") {
              sfxDatabase[safePath].uses += 1;
              document.getElementById(`uses-${index}`).innerText =
                sfxDatabase[safePath].uses;
              setTimeout(() => {
                csInterface.evalScript(
                  `findSequencesForFile("${pathForJsx}")`,
                  (seqs) => {
                    if (seqs && !seqs.startsWith("ERR:")) {
                      const seqArray = seqs
                        .split(",")
                        .filter((s) => s.trim() !== "");
                      seqArray.forEach((s) => {
                        if (!sfxDatabase[safePath].sequences.includes(s))
                          sfxDatabase[safePath].sequences.push(s);
                      });
                      saveDB();
                      if (settings.showSeq) {
                        document.getElementById(`seq-${index}`).style.display =
                          "inline";
                        document.getElementById(`seq-list-${index}`).innerHTML =
                          formatSequenceDisplay(
                            sfxDatabase[safePath].sequences,
                            sound.name,
                          );
                      }
                    } else {
                      saveDB();
                    }
                  },
                );
              }, 1000);
            } else {
              alert(result);
            }
          },
        );
      });

      const wsUrl = "file://" + sound.path;
      const ws = WaveSurfer.create({
        container: "#" + waveId,
        waveColor: "#666666",
        progressColor: "#4fa5e6",
        height: 40,
        barWidth: 2,
        barGap: 1,
        cursorWidth: 1,
      });
      activeWavesurfers.push({
        ws: ws,
        url: wsUrl,
        index: index,
        safePath: safePath,
      });

      const playBtn = item.querySelector(`#play-${index}`);
      const stopBtn = item.querySelector(`#stop-${index}`);
      const playIcon = playBtn.querySelector("i");
      ws.on("interaction", () => {
        ws.play();
      });
      ws.on("play", () => {
        playIcon.className = "fas fa-pause";
      });
      ws.on("pause", () => {
        playIcon.className = "fas fa-play";
      });
      ws.on("finish", () => {
        playIcon.className = "fas fa-play";
        ws.seekTo(0);
      });
      playBtn.addEventListener("click", () => {
        ws.playPause();
      });
      stopBtn.addEventListener("click", () => {
        ws.pause();
        ws.seekTo(0);
      });

      const tagInput = item.querySelector(`#input-${index}`);
      tagInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter" && this.value.trim() !== "") {
          let newTag = this.value.trim();
          if (/[!@#$%^&*(),.?":{}|<>\/\\]/.test(newTag)) {
            alert("Special characters are not allowed in tags.");
            return;
          }
          if (!sfxDatabase[safePath].tags.includes(newTag)) {
            sfxDatabase[safePath].tags.push(newTag);
            saveDB();
            item.querySelector(`#tags-${index}`).innerHTML +=
              `<span class="tag-badge">${newTag} <i class="fas fa-times tag-delete" data-path="${safePath}" data-tag="${newTag}"></i></span>`;
          }
          this.value = "";
        }
      });
    });

    let currentIndex = 0;
    function loadNextWave() {
      if (currentIndex >= activeWavesurfers.length) {
        if (showLoadingScreen)
          setTimeout(() => {
            overlay.style.display = "none";
          }, 300);
        return;
      }
      if (showLoadingScreen) {
        loadingText.innerText = `Loading ${currentIndex + 1}/${activeWavesurfers.length}...`;
        loadingProgress.style.width = `${((currentIndex + 1) / activeWavesurfers.length) * 100}%`;
      }
      const item = activeWavesurfers[currentIndex];
      let isDone = false;
      const next = () => {
        if (isDone) return;
        isDone = true;
        currentIndex++;
        loadNextWave();
      };
      item.ws.on("ready", () => {
        document.getElementById(`time-${item.index}`).innerText = formatTime(
          item.ws.getDuration(),
        );
        next();
      });
      item.ws.on("error", next);
      item.ws.load(item.url);
      setTimeout(next, 5000);
    }
    if (activeWavesurfers.length > 0) loadNextWave();
    else if (showLoadingScreen)
      setTimeout(() => {
        overlay.style.display = "none";
      }, 300);
  }

  const btnSync = document.getElementById("btn-sync-usages");
  if (btnSync) {
    btnSync.addEventListener("click", () => {
      overlay.style.display = "flex";
      loadingText.innerText = "Synchronizing Project Usages...";
      csInterface.evalScript("getAllAudioUsages()", (res) => {
        if (res && !res.startsWith("ERR") && !res.startsWith("Error")) {
          const usages = res.split("|||");
          for (let key in sfxDatabase) {
            sfxDatabase[key].uses = 0;
            sfxDatabase[key].sequences = [];
          }
          usages.forEach((u) => {
            if (!u) return;
            const parts = u.split("|");
            if (parts.length === 3) {
              const cName = parts[0];
              const seqName = parts[1];
              const timeStr = parts[2];
              for (let key in sfxDatabase) {
                if (key.endsWith("/" + cName) || key.endsWith("\\" + cName)) {
                  sfxDatabase[key].uses++;
                  const seqTag = seqName + "|" + timeStr;
                  if (!sfxDatabase[key].sequences.includes(seqTag))
                    sfxDatabase[key].sequences.push(seqTag);
                }
              }
            }
          });
          saveDB();
          activeWavesurfers.forEach((item) => {
            const idx = item.index;
            const safePath = item.safePath;
            const dbData = sfxDatabase[safePath];
            document.getElementById(`uses-${idx}`).innerText = dbData.uses;
            const seqEl = document.getElementById(`seq-${idx}`);
            if (seqEl) {
              if (dbData.sequences.length > 0 && settings.showSeq) {
                seqEl.style.display = "inline";
                document.getElementById(`seq-list-${idx}`).innerHTML =
                  formatSequenceDisplay(
                    dbData.sequences,
                    safePath.split("/").pop(),
                  );
              } else {
                seqEl.style.display = "none";
              }
            }
          });
          setTimeout(() => {
            overlay.style.display = "none";
          }, 300);
        } else {
          overlay.style.display = "none";
          alert("Project is empty or an error occurred.");
        }
      });
    });
  }

  document.getElementById("sfx-list").addEventListener("click", function (e) {
    if (e.target.classList.contains("tag-delete")) {
      const filePath = e.target.getAttribute("data-path");
      const tagToRemove = e.target.getAttribute("data-tag");
      sfxDatabase[filePath].tags = sfxDatabase[filePath].tags.filter(
        (t) => t !== tagToRemove,
      );
      saveDB();
      e.target.parentElement.remove();
    }
    if (e.target.classList.contains("jump-link")) {
      const seqName = e.target.getAttribute("data-seq");
      const timeStr = e.target.getAttribute("data-time");
      const fileName = e.target.getAttribute("data-file");
      csInterface.evalScript(
        `jumpToSequenceTime("${seqName}", "${timeStr}", "${fileName}")`,
        (res) => {
          if (res === "MISSING")
            alert(
              "This audio file was modified or removed from the sequence. Please click Sync to update usages.",
            );
        },
      );
    }
  });

  function syncSettingsToUI() {
    const folderList = document.getElementById("folder-list");
    folderList.innerHTML = "";
    if (settings.folders.length === 0) {
      addFolderInput("");
    } else {
      settings.folders.forEach((folder) => addFolderInput(folder));
    }
    if (document.getElementById("check-show-tags"))
      document.getElementById("check-show-tags").checked = settings.showTags;
    if (document.getElementById("check-show-seq"))
      document.getElementById("check-show-seq").checked = settings.showSeq;
    if (document.getElementById("check-show-seq-time"))
      document.getElementById("check-show-seq-time").checked =
        settings.showSeqTime;
    if (document.getElementById("check-show-all-files"))
      document.getElementById("check-show-all-files").checked =
        settings.showAllFiles;
  }

  function addFolderInput(value = "") {
    const div = document.createElement("div");
    div.className = "folder-input-group";
    div.innerHTML = `<input type="text" class="folder-path" value="${value}" placeholder="e.g., C:/Sounds or D:/SFX"><button class="btn-remove-folder" title="Remove"><i class="fas fa-minus"></i></button>`;
    document.getElementById("folder-list").appendChild(div);
    div
      .querySelector(".btn-remove-folder")
      .addEventListener("click", function () {
        this.parentElement.remove();
      });
  }

  const settingsModal = document.getElementById("settings-modal");
  document.getElementById("settings-btn").addEventListener("click", () => {
    syncSettingsToUI();
    settingsModal.classList.remove("hidden");
  });
  document.getElementById("close-settings").addEventListener("click", () => {
    settingsModal.classList.add("hidden");
  });
  document.getElementById("btn-add-folder").addEventListener("click", () => {
    addFolderInput("");
  });

  const btnClearAll = document.getElementById("btn-clear-all");
  if (btnClearAll) {
    btnClearAll.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all memory data?")) {
        if (confirm("This action cannot be undone. Proceed?")) {
          localStorage.clear();
          alert("Memory cleared successfully! Reloading extension.");
          location.reload();
        }
      }
    });
  }

  document.getElementById("btn-save-settings").addEventListener("click", () => {
    const newFolders = Array.from(document.querySelectorAll(".folder-path"))
      .map((input) => input.value.trim().replace(/\\/g, "/"))
      .filter((val) => val !== "");
    settings.folders = newFolders;
    settings.showTags = document.getElementById("check-show-tags").checked;
    settings.showSeq = document.getElementById("check-show-seq").checked;
    settings.showSeqTime = document.getElementById(
      "check-show-seq-time",
    ).checked;
    settings.showAllFiles = document.getElementById(
      "check-show-all-files",
    ).checked;

    const oldFoldersStr = JSON.stringify(
      JSON.parse(localStorage.getItem("sfx_settings"))?.folders || [],
    );
    saveSettings();
    settingsModal.classList.add("hidden");

    document.querySelectorAll(".sfx-tags").forEach((el) => {
      el.style.display = settings.showTags ? "flex" : "none";
    });
    document.querySelectorAll(".sfx-sequence").forEach((el, idx) => {
      if (!settings.showSeq) {
        el.style.display = "none";
      } else {
        const safePath = activeWavesurfers[idx]?.safePath;
        if (safePath && sfxDatabase[safePath]?.sequences.length > 0) {
          el.style.display = "inline";
          const fileName = safePath.split("/").pop();
          document.getElementById(`seq-list-${idx}`).innerHTML =
            formatSequenceDisplay(sfxDatabase[safePath].sequences, fileName);
        } else {
          el.style.display = "none";
        }
      }
    });

    if (oldFoldersStr !== JSON.stringify(newFolders)) {
      loadSoundsAndRender(true, searchInput.value);
    }
  });

  document.getElementById("btn-refresh").addEventListener("click", () => {
    settingsModal.classList.add("hidden");
    loadSoundsAndRender(true, searchInput.value);
  });

  syncSettingsToUI();
  loadSoundsAndRender(false);
});
