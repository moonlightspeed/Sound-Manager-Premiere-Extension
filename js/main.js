document.addEventListener("DOMContentLoaded", function () {
  let csInterface;
  try {
    csInterface = new CSInterface();
  } catch (err) {
    alert("CSInterface Initialization Failed!");
    return;
  }

  // --- HỆ THỐNG THÔNG BÁO TÍCH HỢP TẮT HIỂN THỊ ---
  let mutedAlerts = JSON.parse(localStorage.getItem("sfx_muted_alerts")) || {};
  function saveMutedAlerts() {
    localStorage.setItem("sfx_muted_alerts", JSON.stringify(mutedAlerts));
  }

  function createSysModal() {
    if (document.getElementById("sys-modal-overlay")) return;
    const div = document.createElement("div");
    div.id = "sys-modal-overlay";
    div.style.cssText =
      "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; justify-content:center; align-items:center;";
    div.innerHTML = `
          <div style="background:#262626; border:1px solid #444; border-radius:8px; padding:20px; width:350px; box-shadow:0 15px 35px rgba(0,0,0,0.8); font-family:sans-serif;">
              <h3 id="sys-modal-title" style="margin:0 0 15px 0; color:#fff; font-size:16px; display:flex; align-items:center;"><i class="fas fa-bell" style="color:#4fa5e6; margin-right:8px;"></i> <span>System</span></h3>
              <p id="sys-modal-msg" style="color:#ccc; font-size:13px; line-height:1.5; margin-bottom:15px;"></p>
              <label id="sys-modal-dont-show-wrap" style="display:none; color:#999; font-size:12px; margin-bottom:20px; cursor:pointer; align-items:center;"><input type="checkbox" id="sys-modal-dont-show" style="margin-right:6px;"> Do not show this popup again</label>
              <div style="display:flex; justify-content:flex-end; gap:10px;">
                  <button id="sys-modal-cancel" style="padding:6px 15px; background:#444; color:#fff; border:none; border-radius:4px; cursor:pointer; display:none;">Cancel</button>
                  <button id="sys-modal-ok" style="padding:6px 15px; background:#4fa5e6; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">OK</button>
              </div>
          </div>
      `;
    document.body.appendChild(div);
  }
  createSysModal();

  window.sysAlert = function (msg, title = "Notification", msgId = null) {
    if (msgId && mutedAlerts[msgId]) return;
    document.getElementById("sys-modal-title").querySelector("span").innerText =
      title;
    document.getElementById("sys-modal-msg").innerText = msg;
    document.getElementById("sys-modal-cancel").style.display = "none";
    const dontWrap = document.getElementById("sys-modal-dont-show-wrap");
    const dontCb = document.getElementById("sys-modal-dont-show");
    if (msgId) {
      dontWrap.style.display = "flex";
      dontCb.checked = false;
    } else {
      dontWrap.style.display = "none";
    }
    document.getElementById("sys-modal-overlay").style.display = "flex";
    document.getElementById("sys-modal-ok").onclick = () => {
      if (msgId && dontCb.checked) {
        mutedAlerts[msgId] = true;
        saveMutedAlerts();
      }
      document.getElementById("sys-modal-overlay").style.display = "none";
    };
  };

  window.sysConfirm = function (
    msg,
    callback,
    title = "Confirmation",
    msgId = null,
  ) {
    if (msgId && mutedAlerts[msgId]) {
      callback();
      return;
    }
    document.getElementById("sys-modal-title").querySelector("span").innerText =
      title;
    document.getElementById("sys-modal-msg").innerText = msg;
    document.getElementById("sys-modal-cancel").style.display = "block";
    const dontWrap = document.getElementById("sys-modal-dont-show-wrap");
    const dontCb = document.getElementById("sys-modal-dont-show");
    if (msgId) {
      dontWrap.style.display = "flex";
      dontCb.checked = false;
    } else {
      dontWrap.style.display = "none";
    }
    document.getElementById("sys-modal-overlay").style.display = "flex";
    document.getElementById("sys-modal-cancel").onclick = () =>
      (document.getElementById("sys-modal-overlay").style.display = "none");
    document.getElementById("sys-modal-ok").onclick = () => {
      if (msgId && dontCb.checked) {
        mutedAlerts[msgId] = true;
        saveMutedAlerts();
      }
      document.getElementById("sys-modal-overlay").style.display = "none";
      callback();
    };
  };

  const overlay = document.createElement("div");
  overlay.id = "loading-overlay";
  overlay.innerHTML = `<div id="loading-text">Processing...</div><div class="progress-container"><div class="progress-bar" id="loading-progress"></div></div>`;
  document.body.appendChild(overlay);
  const loadingText = document.getElementById("loading-text");
  const loadingProgress = document.getElementById("loading-progress");

  const ctxMenu = document.createElement("div");
  ctxMenu.className = "context-menu";
  ctxMenu.id = "main-ctx-menu";
  ctxMenu.innerHTML = `<div id="m-rename">Rename Sound</div><div id="m-similar">Find Similar Sounds</div><div id="m-clear">Clear Usage Data</div><div id="m-clear-tags">Clear All Tags</div><div id="m-hide-file" style="color: #ff9800; border-top: 1px solid #444; margin-top: 4px; padding-top: 4px;"><i class="fas fa-eye-slash"></i> Hide File</div><div id="m-delete-file" style="color: #ff5555; margin-top: 4px;"><i class="fas fa-trash-alt"></i> Delete File From Disk</div>`;
  document.body.appendChild(ctxMenu);
  let openMenuIndex = -1;
  window.addEventListener("click", (e) => {
    if (!e.target.closest(".btn-more")) {
      ctxMenu.style.display = "none";
      openMenuIndex = -1;
    }
  });

  let sfxDatabase = JSON.parse(localStorage.getItem("sfx_db")) || {};
  let settings = JSON.parse(localStorage.getItem("sfx_settings")) || {
    folders: [],
    showTags: true,
    showSeq: true,
    showSeqTime: true,
    showAllFiles: false,
  };
  let playlists = JSON.parse(localStorage.getItem("sfx_playlists")) || {};
  let searchHistory =
    JSON.parse(localStorage.getItem("sfx_search_history")) || [];

  window.activeTags = [];
  window.excludeTags = [];
  window.expandedPlaylists = [];

  function saveDB() {
    localStorage.setItem("sfx_db", JSON.stringify(sfxDatabase));
  }
  function saveSettings() {
    localStorage.setItem("sfx_settings", JSON.stringify(settings));
  }
  function savePlaylists() {
    localStorage.setItem("sfx_playlists", JSON.stringify(playlists));
  }

  let globalCachedSounds = [];
  function scanFilesFromDisk() {
    globalCachedSounds = [];
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
              globalCachedSounds.push({ name: file, path: safeFolder + file });
            }
          });
        }
      });
    }
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
        if (tracks.length === 0 || tracks[0] === "")
          trackSelect.innerHTML = '<option value="">(Empty)</option>';
        else {
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
        return `<span class="jump-link" data-seq="${seqName}" data-time="${timeStr}" data-file="${fileName}" style="cursor:pointer; text-decoration:underline; color:#FFD700;" title="Jump to ${timeStr}">${displayStr}</span>`;
      })
      .join(", ");
  }

  let activeWavesurfers = [];
  let plWavesurfers = [];
  let usageWavesurfers = [];
  const searchInput = document.getElementById("search-input");
  const filterSort = document.getElementById("filter-sort");

  // --- LOGIC GỢI Ý TÌM KIẾM (AUTOCOMPLETE INLINE + TAGS) ---
  let isDeleting = false;
  searchInput.addEventListener("keydown", (e) => {
    isDeleting = e.key === "Backspace" || e.key === "Delete";
    if (e.key === "Enter") {
      e.preventDefault();
      let term = searchInput.value.trim();
      if (term && !searchHistory.includes(term)) {
        searchHistory.unshift(term);
        if (searchHistory.length > 50) searchHistory.pop();
        localStorage.setItem(
          "sfx_search_history",
          JSON.stringify(searchHistory),
        );
      }
      searchInput.setSelectionRange(
        searchInput.value.length,
        searchInput.value.length,
      );
      loadSoundsAndRender(false);
    }
  });

  searchInput.addEventListener("input", (e) => {
    if (isDeleting) return;
    let val = searchInput.value;
    if (!val || searchInput.selectionStart !== val.length) return;

    // 1. Kiểm tra AutoComplete cho việc gõ Tag (vd: t:"wa -> t:"waterfall")
    const tagMatch = val.match(/(t:"([^"]*))$/);
    if (tagMatch && tagMatch[2].length > 0) {
      const typingTag = tagMatch[2].toLowerCase();
      let allTags = new Set();
      Object.values(sfxDatabase).forEach((dbItem) => {
        if (dbItem.tags) dbItem.tags.forEach((t) => allTags.add(t));
      });

      let foundTag = Array.from(allTags).find((t) =>
        t.toLowerCase().startsWith(typingTag),
      );
      if (foundTag) {
        let prefix = val.substring(0, val.length - typingTag.length);
        let fullMatch = prefix + foundTag + '"';
        searchInput.value = fullMatch;
        searchInput.setSelectionRange(val.length, fullMatch.length);
        return; // Dừng lại, không tìm History nữa
      }
    }

    // 2. Nếu không phải Tag, tìm theo Lịch Sử
    let match = searchHistory.find((h) =>
      h.toLowerCase().startsWith(val.toLowerCase()),
    );
    if (match) {
      searchInput.value = val + match.substring(val.length);
      searchInput.setSelectionRange(val.length, match.length);
    }
  });

  if (filterSort) {
    filterSort.addEventListener("change", () => loadSoundsAndRender(false));
  }

  document.addEventListener("keydown", (e) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (isCtrl && !e.shiftKey && key === "f") {
      e.preventDefault();
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
    } else if (isCtrl && !e.shiftKey && key === "x") {
      e.preventDefault();
      const btnDeselect = document.getElementById("btn-deselect-tags");
      if (btnDeselect) btnDeselect.click();
    } else if (isCtrl && !e.shiftKey && key === "e") {
      e.preventDefault();
      const btnPl = document.getElementById("btn-show-playlists");
      if (btnPl) btnPl.click();
    } else if (isCtrl && !e.shiftKey && key === "d") {
      e.preventDefault();
      const btnOpenTags = document.getElementById("btn-open-tags");
      if (btnOpenTags) btnOpenTags.click();
    }
  });

  function loadSoundsAndRender(showLoadingScreen = false, similarToPath = "") {
    const listContainer = document.getElementById("sfx-list");
    activeWavesurfers.forEach((item) => item.ws.destroy());
    activeWavesurfers = [];
    listContainer.innerHTML = "";

    let allSounds = globalCachedSounds;
    if (allSounds.length === 0) {
      listContainer.innerHTML =
        '<p style="text-align:center; color:#aaa; margin-top:20px;">Directory is empty. Please add a path in Settings or Refresh.</p>';
      return;
    }

    const hiddenList = playlists["Hidden Files"] || [];
    allSounds = allSounds.filter(
      (s) => !hiddenList.includes(s.path.replace(/\\/g, "/")),
    );

    let filteredSounds = allSounds;
    const rawSearch = searchInput.value.trim();

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
    } else {
      const manualParts = rawSearch
        .split("+")
        .map((p) => p.trim())
        .filter(Boolean);
      filteredSounds = allSounds.filter((sound) => {
        const safePath = sound.path.replace(/\\/g, "/");
        const fileTags = (sfxDatabase[safePath]?.tags || []).map((t) =>
          t.toLowerCase(),
        );
        const fileName = sound.name.toLowerCase();

        if (window.activeTags.length > 0) {
          const hasAllActive = window.activeTags.every((at) =>
            fileTags.includes(at.toLowerCase()),
          );
          if (!hasAllActive) return false;
        }
        if (window.excludeTags.length > 0) {
          const hasAnyExclude = window.excludeTags.some((et) =>
            fileTags.includes(et.toLowerCase()),
          );
          if (hasAnyExclude) return false;
        }

        if (manualParts.length > 0) {
          let matchesManual = true;
          for (let part of manualParts) {
            let isExclude = part.startsWith("-");
            let term = isExclude ? part.substring(1).trim() : part;
            let requiresTag = false;
            let checkTerms = [];
            if (term.startsWith('t:"') && term.endsWith('"')) {
              requiresTag = true;
              checkTerms = term
                .substring(3, term.length - 1)
                .split(",")
                .map((s) => s.trim().toLowerCase());
            } else {
              checkTerms = [term.toLowerCase()];
            }
            let termMatch = false;
            if (requiresTag) {
              termMatch = checkTerms.every((ct) => fileTags.includes(ct));
            } else {
              termMatch =
                fileName.includes(term) ||
                fileTags.some((ft) => ft.includes(term));
            }
            if (isExclude && termMatch) {
              matchesManual = false;
              break;
            }
            if (!isExclude && !termMatch) {
              matchesManual = false;
              break;
            }
          }
          if (!matchesManual) return false;
        }
        return true;
      });
    }

    const filterVal = filterSort ? filterSort.value : "all";
    if (filterVal === "fav")
      filteredSounds = filteredSounds.filter(
        (s) => sfxDatabase[s.path.replace(/\\/g, "/")]?.fav,
      );
    if (filterVal === "az")
      filteredSounds.sort((a, b) => a.name.localeCompare(b.name));
    else if (filterVal === "za")
      filteredSounds.sort((a, b) => b.name.localeCompare(a.name));
    else if (filterVal === "uses")
      filteredSounds.sort(
        (a, b) =>
          (sfxDatabase[b.path.replace(/\\/g, "/")]?.uses || 0) -
          (sfxDatabase[a.path.replace(/\\/g, "/")]?.uses || 0),
      );

    if (
      !settings.showAllFiles &&
      rawSearch === "" &&
      filterVal === "all" &&
      !similarToPath &&
      window.activeTags.length === 0
    )
      filteredSounds = filteredSounds.slice(0, 15);

    if (filteredSounds.length === 0) {
      listContainer.innerHTML =
        '<p style="text-align:center; color:#aaa; margin-top:20px;">No results found.</p>';
      return;
    }
    if (showLoadingScreen) {
      overlay.style.display = "flex";
      loadingText.innerText = `Loading ${filteredSounds.length} files...`;
      loadingProgress.style.width = "0%";
    } else overlay.style.display = "none";

    filteredSounds.forEach((sound, index) => {
      let safePath = sound.path.replace(/\\/g, "/");
      if (!sfxDatabase[safePath])
        sfxDatabase[safePath] = {
          tags: [],
          uses: 0,
          fav: false,
          sequences: [],
        };
      if (!Array.isArray(sfxDatabase[safePath].sequences))
        sfxDatabase[safePath].sequences = [];
      const dbData = sfxDatabase[safePath];
      const waveId = "wave-" + index;

      const item = document.createElement("div");
      item.className = "sfx-item";
      let tagsHTML = "";
      dbData.tags.forEach((t) => {
        tagsHTML += `<span class="tag-badge" data-path="${safePath}" data-tag="${t}">${t} <i class="fas fa-times tag-delete" data-path="${safePath}" data-tag="${t}"></i></span>`;
      });

      const seqHtml =
        settings.showSeq && dbData.sequences.length > 0
          ? `<span class="sfx-sequence" id="seq-${index}">(In: <span id="seq-list-${index}">${formatSequenceDisplay(dbData.sequences, sound.name)}</span>)</span>`
          : `<span class="sfx-sequence" id="seq-${index}" style="display:none;">(In: <span id="seq-list-${index}"></span>)</span>`;

      item.innerHTML = `
          <div class="sfx-info">
              <div class="sfx-thumb play-pause-thumb" id="drag-icon-${index}" draggable="true" style="cursor: pointer; background: #333; display: flex; justify-content: center; align-items: center;" title="${sound.name}"><i class="fas fa-play" style="pointer-events: none; color: #fff;"></i></div>
              <div class="sfx-details">
                  <div class="sfx-name" id="drag-name-${index}" draggable="true" style="cursor: grab;" title="${sound.name}">${sound.name}</div>
                  <p class="sfx-meta"><span id="time-${index}">--:--</span> • <span id="uses-${index}">${dbData.uses}</span> usages ${seqHtml}</p>
              </div>
              <div class="sfx-actions">
                  <input type="range" id="vol-${index}" min="0" max="1" step="0.05" value="1" title="Volume (Double click to reset)" style="width: 50px; margin-right: 8px; accent-color: #4fa5e6; cursor: pointer;">
                  <button class="btn-add" data-path="${safePath}" id="add-${index}" title="Add to Target Track"><i class="fas fa-plus"></i></button>
                  <button class="btn-add-playlist" data-path="${safePath}" id="pl-${index}" title="Add to Playlist" style="position: relative;"><i class="fas fa-folder-plus"></i></button>
                  <button class="btn-replace" data-path="${safePath}" id="replace-${index}" title="Replace Selected Timeline Clip"><i class="fas fa-exchange-alt"></i></button>
                  <button class="btn-more" id="more-${index}"><i class="fas fa-ellipsis-v"></i></button>
              </div>
          </div>
          <div id="${waveId}" class="waveform-container"></div>
          <div class="sfx-tags" style="display: ${settings.showTags ? "flex" : "none"}; align-items:center;">
              <span class="tag-label">Tags:</span><span class="tag-list" id="tags-${index}">${tagsHTML}</span>
              <div style="position:relative; display:inline-block; margin-left:5px;">
                  <input type="text" class="tag-input" id="input-${index}" placeholder="+ Tag & Enter" style="width:100px;">
                  <div id="mini-suggest-${index}" class="mini-suggest-box" style="display:none; position:absolute; bottom:100%; left:0; background:#222; border:1px solid #555; max-height:120px; overflow-y:auto; z-index:100; font-size:11px; width:120px; box-shadow:0 -2px 5px rgba(0,0,0,0.5);"></div>
              </div>
              <button class="btn-fav ${dbData.fav ? "active" : ""}" id="fav-${index}" title="Favorite" style="margin-left:auto;"><i class="fas fa-star"></i></button>
          </div>
      `;
      listContainer.appendChild(item);

      const thumbBtn = item.querySelector(`#drag-icon-${index}`);
      const thumbIcon = thumbBtn.querySelector("i");
      let isDraggingThumb = false;
      thumbBtn.addEventListener("dragstart", (e) => {
        isDraggingThumb = true;
        let osPath = safePath;
        if (navigator.appVersion.indexOf("Win") !== -1)
          osPath = osPath.replace(/\//g, "\\");
        e.dataTransfer.setData("com.adobe.cep.dnd.file.0", osPath);
      });
      thumbBtn.addEventListener("dragend", () => {
        setTimeout(() => (isDraggingThumb = false), 150);
      });

      const nameDrag = item.querySelector(`#drag-name-${index}`);
      nameDrag.addEventListener("dragstart", (e) => {
        let osPath = safePath;
        if (navigator.appVersion.indexOf("Win") !== -1)
          osPath = osPath.replace(/\//g, "\\");
        e.dataTransfer.setData("com.adobe.cep.dnd.file.0", osPath);
      });

      item.querySelector(`#more-${index}`).addEventListener("click", (e) => {
        e.stopPropagation();
        if (openMenuIndex === index) {
          ctxMenu.style.display = "none";
          openMenuIndex = -1;
          return;
        }
        openMenuIndex = index;
        ctxMenu.style.display = "block";
        ctxMenu.style.top = e.pageY + "px";
        ctxMenu.style.left = e.pageX - 160 + "px";

        document.getElementById("m-similar").onclick = () => {
          ctxMenu.style.display = "none";
          loadSoundsAndRender(true, "", safePath);
        };
        document.getElementById("m-clear").onclick = () => {
          sfxDatabase[safePath].uses = 0;
          sfxDatabase[safePath].sequences = [];
          saveDB();
          document.getElementById(`uses-${index}`).innerText = "0";
          if (document.getElementById(`seq-${index}`))
            document.getElementById(`seq-${index}`).style.display = "none";
          ctxMenu.style.display = "none";
        };
        document.getElementById("m-clear-tags").onclick = () => {
          sfxDatabase[safePath].tags = [];
          saveDB();
          if (item.querySelector(`#tags-${index}`))
            item.querySelector(`#tags-${index}`).innerHTML = "";
          ctxMenu.style.display = "none";
        };

        document.getElementById("m-hide-file").onclick = () => {
          ctxMenu.style.display = "none";
          if (!playlists["Hidden Files"]) playlists["Hidden Files"] = [];
          if (!playlists["Hidden Files"].includes(safePath)) {
            playlists["Hidden Files"].push(safePath);
            savePlaylists();
            sysAlert(
              `File hidden!\nTo unhide: Open Playlists -> "Hidden Files" and delete it from there.`,
              "Success",
              "alert_hide_file",
            );
            loadSoundsAndRender(false, searchInput.value);
          }
        };

        document.getElementById("m-delete-file").onclick = () => {
          ctxMenu.style.display = "none";
          sysConfirm(
            `CRITICAL WARNING: Are you sure you want to permanently DELETE this file from your computer?\n\nFile: ${sound.name}`,
            () => {
              csInterface.evalScript(
                `try { var f = new File("${safePath.replace(/\//g, "\\\\")}"); if (f.exists) { f.remove(); "Success"; } else { "Not Found"; } } catch(e) { "Error"; }`,
                (res) => {
                  if (res === "Success") {
                    delete sfxDatabase[safePath];
                    saveDB();
                    sysAlert(
                      "File deleted successfully.",
                      "Success",
                      "alert_del_file_ok",
                    );
                    scanFilesFromDisk();
                    loadSoundsAndRender(false);
                  } else {
                    sysAlert(
                      "Failed to delete file. It might be in use or permission denied.",
                      "Error",
                    );
                  }
                },
              );
            },
            "Delete File",
            "confirm_del_disk_file",
          );
        };

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
                  sfxDatabase[newPath] = sfxDatabase[safePath];
                  delete sfxDatabase[safePath];
                  saveDB();
                  nameDrag.innerText = newName;
                  sound.name = newName;
                  sound.path = newPath;
                  safePath = newPath;
                  scanFilesFromDisk();
                  activeWavesurfers[index].url = "file://" + newPath;
                  activeWavesurfers[index].ws.load("file://" + newPath);
                } else {
                  sysAlert(res, "Error");
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

      item.querySelector(`#pl-${index}`).addEventListener("click", (e) => {
        e.stopPropagation();
        let oldPlMenu = document.getElementById("mini-pl-menu");
        if (oldPlMenu) oldPlMenu.remove();
        const plMenu = document.createElement("div");
        plMenu.id = "mini-pl-menu";
        plMenu.style.cssText =
          "position: absolute; background: #222; border: 1px solid #555; border-radius: 4px; padding: 5px; z-index: 1000; box-shadow: 0 4px 10px rgba(0,0,0,0.5); min-width: 150px;";
        plMenu.style.top = e.pageY + 10 + "px";
        plMenu.style.left = e.pageX - 100 + "px";
        let html = `<div style="font-size:11px; color:#aaa; margin-bottom:5px; border-bottom:1px solid #444; padding-bottom:3px;">Add to Playlist:</div>`;
        const plNames = Object.keys(playlists);

        let visiblePls = plNames.filter((p) => p !== "Hidden Files");
        if (visiblePls.length === 0)
          html += `<div style="font-size:12px; color:#ff5555; padding:5px;">No playlists found.</div>`;
        else
          visiblePls.forEach((plName) => {
            html += `<div class="pl-option" data-name="${plName}" style="padding: 5px; cursor: pointer; color: white; font-size: 13px;">${plName}</div>`;
          });

        plMenu.innerHTML = html;
        document.body.appendChild(plMenu);

        plMenu.querySelectorAll(".pl-option").forEach((opt) => {
          opt.onmouseover = () => (opt.style.background = "#4fa5e6");
          opt.onmouseout = () => (opt.style.background = "transparent");
          opt.onclick = () => {
            const pName = opt.getAttribute("data-name");
            if (!playlists[pName].includes(safePath)) {
              playlists[pName].push(safePath);
              savePlaylists();
              sysAlert(`Added to ${pName}!`, "Success", "alert_add_pl_ok");
            } else {
              sysAlert(`Already in ${pName}`, "Info", "alert_add_pl_dup");
            }
            plMenu.remove();
            if (
              document.getElementById("playlist-modal") &&
              !document
                .getElementById("playlist-modal")
                .classList.contains("hidden")
            )
              renderPlaylistBoard();
          };
        });
        setTimeout(() => {
          window.addEventListener("click", function closePlMenu(ev) {
            if (!ev.target.closest("#mini-pl-menu")) {
              if (document.getElementById("mini-pl-menu"))
                document.getElementById("mini-pl-menu").remove();
              window.removeEventListener("click", closePlMenu);
            }
          });
        }, 10);
      });

      const miniInput = item.querySelector(`#input-${index}`);
      const miniSuggest = item.querySelector(`#mini-suggest-${index}`);
      let selectedSuggestIndex = -1;
      miniInput.addEventListener("input", function () {
        const val = this.value.toLowerCase().trim();
        selectedSuggestIndex = -1;
        if (!val) {
          miniSuggest.style.display = "none";
          return;
        }
        let allTags = new Set();
        Object.values(sfxDatabase).forEach((dbItem) => {
          if (dbItem.tags) dbItem.tags.forEach((t) => allTags.add(t));
        });
        let filtered = Array.from(allTags).filter((t) =>
          t.toLowerCase().includes(val),
        );
        miniSuggest.innerHTML = "";
        if (filtered.length > 0) {
          miniSuggest.style.display = "block";
          filtered.forEach((t, i) => {
            let div = document.createElement("div");
            div.innerText = t;
            div.style.cssText =
              "padding:5px 8px; cursor:pointer; border-bottom:1px solid #444; color:#ddd;";
            div.onmouseover = () => {
              Array.from(miniSuggest.children).forEach(
                (c) => (c.style.background = "transparent"),
              );
              div.style.background = "#4CAF50";
              selectedSuggestIndex = i;
            };
            div.onmouseout = () => (div.style.background = "transparent");
            div.onclick = () => {
              miniInput.value = t;
              miniSuggest.style.display = "none";
              miniInput.focus();
              miniInput.dispatchEvent(
                new KeyboardEvent("keypress", { key: "Enter" }),
              );
            };
            miniSuggest.appendChild(div);
          });
        } else {
          miniSuggest.style.display = "none";
        }
      });
      miniInput.addEventListener("keydown", function (e) {
        if (
          miniSuggest.style.display === "block" &&
          miniSuggest.children.length > 0
        ) {
          const items = Array.from(miniSuggest.children);
          if (e.key === "Tab") {
            e.preventDefault();
            if (selectedSuggestIndex === -1)
              selectedSuggestIndex = items.length - 1;
            else
              selectedSuggestIndex =
                (selectedSuggestIndex - 1 + items.length) % items.length;
            items.forEach((div, idx) => {
              div.style.background =
                idx === selectedSuggestIndex ? "#4CAF50" : "transparent";
              if (idx === selectedSuggestIndex)
                div.scrollIntoView({ block: "nearest" });
            });
          } else if (e.key === "Enter" && selectedSuggestIndex !== -1) {
            miniInput.value = items[selectedSuggestIndex].innerText;
            miniSuggest.style.display = "none";
            selectedSuggestIndex = -1;
          }
        }
      });
      miniInput.addEventListener("blur", () =>
        setTimeout(() => {
          miniSuggest.style.display = "none";
          selectedSuggestIndex = -1;
        }, 200),
      );

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
          return sysAlert("Please open a Sequence and select a Target Track.");
        csInterface.evalScript(
          `importAndAddToTimeline("${safePath.replace(/\//g, "\\\\")}", "${targetTrack}")`,
          (result) => {
            if (result === "Success") {
              sfxDatabase[safePath].uses += 1;
              document.getElementById(`uses-${index}`).innerText =
                sfxDatabase[safePath].uses;
              saveDB();
              sysAlert("Added!", "Success", "alert_add_timeline_ok");
            } else {
              sysAlert(result, "Error");
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

      // NÚT VOLUME (MAX 1, DOUBLE CLICK VỀ DEFAULT)
      const volSlider = item.querySelector(`#vol-${index}`);
      volSlider.addEventListener("input", (e) => {
        ws.setVolume(parseFloat(e.target.value));
      });
      volSlider.addEventListener("dblclick", (e) => {
        e.target.value = 1;
        ws.setVolume(1);
      });

      ws.on("interaction", () => ws.play());
      ws.on("play", () => {
        thumbIcon.className = "fas fa-pause";
        activeWavesurfers.forEach((obj) => {
          if (obj.ws !== ws) {
            if (obj.ws.isPlaying()) obj.ws.pause();
            obj.ws.seekTo(0);
          }
        });
        plWavesurfers.forEach((obj) => {
          if (obj.ws !== ws) {
            if (obj.ws.isPlaying()) obj.ws.pause();
            obj.ws.seekTo(0);
          }
        });
        usageWavesurfers.forEach((obj) => {
          if (obj.ws !== ws) {
            if (obj.ws.isPlaying()) obj.ws.pause();
            obj.ws.seekTo(0);
          }
        });
      });
      ws.on("pause", () => (thumbIcon.className = "fas fa-play"));
      ws.on("finish", () => {
        thumbIcon.className = "fas fa-play";
        ws.seekTo(0);
      });
      thumbBtn.addEventListener("click", () => {
        if (!isDraggingThumb) ws.playPause();
      });

      miniInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter" && this.value.trim() !== "") {
          let newTag = this.value.trim();
          if (/[!@#$%^&*(),.?":{}|<>\/\\]/.test(newTag))
            return sysAlert("Special characters are not allowed in tags.");
          if (!sfxDatabase[safePath].tags.includes(newTag)) {
            sfxDatabase[safePath].tags.push(newTag);
            saveDB();
            item.querySelector(`#tags-${index}`).innerHTML +=
              `<span class="tag-badge" data-path="${safePath}" data-tag="${newTag}">${newTag} <i class="fas fa-times tag-delete" data-path="${safePath}" data-tag="${newTag}"></i></span>`;
          }
          this.value = "";
          miniSuggest.style.display = "none";
          renderTagBoard(document.getElementById("tag-sort-select").value);
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

  // --- LOGIC BẢNG SEQUENCE USAGES ---
  const usageModal = document.getElementById("usage-modal");
  if (document.getElementById("btn-show-usages"))
    document.getElementById("btn-show-usages").addEventListener("click", () => {
      renderUsageBoard();
      usageModal.classList.remove("hidden");
    });
  if (document.getElementById("close-usage"))
    document.getElementById("close-usage").addEventListener("click", () => {
      usageModal.classList.add("hidden");
      usageWavesurfers.forEach((item) => item.ws.destroy());
      usageWavesurfers = [];
    });
  if (document.getElementById("usage-simple-view"))
    document
      .getElementById("usage-simple-view")
      .addEventListener("change", renderUsageBoard);
  if (document.getElementById("usage-sort"))
    document
      .getElementById("usage-sort")
      .addEventListener("change", renderUsageBoard);
  if (document.getElementById("usage-search"))
    document
      .getElementById("usage-search")
      .addEventListener("input", renderUsageBoard);

  function renderUsageBoard() {
    usageWavesurfers.forEach((item) => item.ws.destroy());
    usageWavesurfers = [];
    const listContainer = document.getElementById("usage-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";
    const isSimple = document.getElementById("usage-simple-view")?.checked;
    const sortType = document.getElementById("usage-sort")?.value || "most";
    const query =
      document.getElementById("usage-search")?.value.toLowerCase().trim() || "";

    let usedSounds = [];
    for (let path in sfxDatabase) {
      let dbData = sfxDatabase[path];
      if (dbData.uses > 0 && dbData.sequences && dbData.sequences.length > 0) {
        usedSounds.push({
          path,
          name: path.split("/").pop(),
          uses: dbData.uses,
          seqs: dbData.sequences,
        });
      }
    }

    if (query)
      usedSounds = usedSounds.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.seqs.some((sq) => sq.toLowerCase().includes(query)),
      );
    if (sortType === "most") usedSounds.sort((a, b) => b.uses - a.uses);
    if (sortType === "az")
      usedSounds.sort((a, b) => a.name.localeCompare(b.name));
    if (sortType === "za")
      usedSounds.sort((a, b) => b.name.localeCompare(a.name));

    if (usedSounds.length === 0) {
      listContainer.innerHTML =
        "<p style='color:#aaa;'>No sounds are currently used in sequences.</p>";
      return;
    }

    usedSounds.forEach((s, idx) => {
      let item = document.createElement("div");
      item.className = "sfx-item";
      item.style.marginBottom = isSimple ? "4px" : "10px";
      let seqFormatted = s.seqs
        .map((sq) => {
          let parts = sq.split("|");
          return `<span class="jump-link" data-seq="${parts[0]}" data-time="${parts[1] || "00:00"}" data-file="${s.name}" style="cursor:pointer; text-decoration:underline; margin-right:8px; color: #FFD700;" title="Jump to ${parts[1] || "00:00"}">${parts[0]} (${parts[1] || "00:00"})</span>`;
        })
        .join("");

      if (isSimple) {
        item.style.padding = "4px 8px";
        item.style.background = "#2c2c2c";
        item.style.borderLeft = "3px solid #4fa5e6";
        item.innerHTML = `<div style="font-weight:bold; font-size:12px;">${s.name} <span style="color:#aaa; font-size:10px; font-weight:normal;">(${s.uses} uses)</span></div><div style="margin-top:2px; font-size:11px;">${seqFormatted}</div>`;
        listContainer.appendChild(item);
      } else {
        const uWaveId = "usage-wave-" + idx;
        item.innerHTML = `
              <div class="sfx-info">
                  <div class="sfx-thumb" id="u-drag-icon-${idx}" draggable="true" style="cursor: pointer; background: #333; display: flex; justify-content: center; align-items: center;" title="${s.name}"><i class="fas fa-play" style="pointer-events: none; color: #fff;"></i></div>
                  <div class="sfx-details"><div class="sfx-name" draggable="true" style="cursor: grab;">${s.name}</div><p class="sfx-meta"><span id="u-time-${idx}">--:--</span> • ${s.uses} usages (In: ${seqFormatted})</p></div>
                  <div class="sfx-actions">
                      <input type="range" id="u-vol-${idx}" min="0" max="1" step="0.05" value="1" title="Volume (Double click to reset)" style="width: 50px; margin-right: 8px; accent-color: #4fa5e6; cursor: pointer;">
                      <button class="btn-add" id="u-add-${idx}" title="Add to Target Track"><i class="fas fa-plus"></i></button>
                  </div>
              </div>
              <div id="${uWaveId}" class="waveform-container"></div>`;
        listContainer.appendChild(item);

        const ws = WaveSurfer.create({
          container: "#" + uWaveId,
          waveColor: "#666666",
          progressColor: "#4fa5e6",
          height: 40,
          barWidth: 2,
          barGap: 1,
          cursorWidth: 1,
        });
        usageWavesurfers.push({ ws: ws, url: "file://" + s.path, index: idx });

        const volSlider = item.querySelector(`#u-vol-${idx}`);
        volSlider.addEventListener("input", (e) => {
          ws.setVolume(parseFloat(e.target.value));
        });
        volSlider.addEventListener("dblclick", (e) => {
          e.target.value = 1;
          ws.setVolume(1);
        });

        const thumbBtn = item.querySelector(`#u-drag-icon-${idx}`);
        const thumbIcon = thumbBtn.querySelector("i");
        ws.on("interaction", () => ws.play());
        ws.on("play", () => {
          thumbIcon.className = "fas fa-pause";
          activeWavesurfers.forEach((obj) => {
            if (obj.ws !== ws) {
              if (obj.ws.isPlaying()) obj.ws.pause();
              obj.ws.seekTo(0);
            }
          });
          plWavesurfers.forEach((obj) => {
            if (obj.ws !== ws) {
              if (obj.ws.isPlaying()) obj.ws.pause();
              obj.ws.seekTo(0);
            }
          });
          usageWavesurfers.forEach((obj) => {
            if (obj.ws !== ws) {
              if (obj.ws.isPlaying()) obj.ws.pause();
              obj.ws.seekTo(0);
            }
          });
        });
        ws.on("pause", () => (thumbIcon.className = "fas fa-play"));
        ws.on("finish", () => {
          thumbIcon.className = "fas fa-play";
          ws.seekTo(0);
        });

        let isDragging = false;
        thumbBtn.addEventListener("dragstart", (e) => {
          isDragging = true;
          let osPath = s.path;
          if (navigator.appVersion.indexOf("Win") !== -1)
            osPath = osPath.replace(/\//g, "\\");
          e.dataTransfer.setData("com.adobe.cep.dnd.file.0", osPath);
        });
        thumbBtn.addEventListener("dragend", () =>
          setTimeout(() => (isDragging = false), 150),
        );
        thumbBtn.addEventListener("click", () => {
          if (!isDragging) ws.playPause();
        });
        ws.on("ready", () => {
          document.getElementById(`u-time-${idx}`).innerText = formatTime(
            ws.getDuration(),
          );
        });
        ws.load("file://" + s.path);

        item.querySelector(`#u-add-${idx}`).addEventListener("click", () => {
          const targetTrack = document.getElementById("track-val").value;
          if (!targetTrack) return sysAlert("Please select a Target Track.");
          csInterface.evalScript(
            `importAndAddToTimeline("${s.path.replace(/\//g, "\\\\")}", "${targetTrack}")`,
            (res) => {
              if (res === "Success")
                sysAlert("Added!", "Success", "alert_add_timeline_ok_use");
              else sysAlert(res, "Error");
            },
          );
        });
      }
    });
  }

  // --- LOGIC BẢNG PLAYLIST ---
  const playlistModal = document.getElementById("playlist-modal");
  if (document.getElementById("btn-show-playlists"))
    document
      .getElementById("btn-show-playlists")
      .addEventListener("click", () => {
        renderPlaylistBoard();
        playlistModal.classList.remove("hidden");
      });
  if (document.getElementById("close-playlist"))
    document.getElementById("close-playlist").addEventListener("click", () => {
      playlistModal.classList.add("hidden");
      plWavesurfers.forEach((item) => item.ws.destroy());
      plWavesurfers = [];
    });
  if (document.getElementById("btn-new-playlist"))
    document
      .getElementById("btn-new-playlist")
      .addEventListener("click", () => {
        const name = prompt("Enter new playlist name:");
        if (name && name.trim() !== "") {
          if (playlists[name]) return sysAlert("Playlist already exists!");
          playlists[name] = [];
          savePlaylists();
          window.expandedPlaylists.push(name);
          renderPlaylistBoard();
        }
      });

  if (document.getElementById("btn-bulk-remove-pl")) {
    document
      .getElementById("btn-bulk-remove-pl")
      .addEventListener("click", () => {
        const checked = document.querySelectorAll(".pl-bulk-cb:checked");
        if (checked.length === 0)
          return sysAlert(
            "Please check the boxes next to the items you want to remove.",
            "Info",
            "alert_no_items_checked",
          );
        sysConfirm(
          `Remove ${checked.length} selected items from their playlists?`,
          () => {
            checked.forEach((cb) => {
              const pName = cb.getAttribute("data-plname");
              const pPath = cb.getAttribute("data-path");
              playlists[pName] = playlists[pName].filter((p) => p !== pPath);
            });
            savePlaylists();
            renderPlaylistBoard();
            if (
              document.querySelectorAll(
                ".pl-bulk-cb:checked[data-plname='Hidden Files']",
              ).length > 0
            )
              loadSoundsAndRender(false);
          },
          "Bulk Remove",
          "confirm_bulk_remove_pl",
        );
      });
  }

  function renderPlaylistBoard() {
    plWavesurfers.forEach((item) => item.ws.destroy());
    plWavesurfers = [];
    const listContainer = document.getElementById("playlist-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    const plNames = Object.keys(playlists);
    if (plNames.length === 0) {
      listContainer.innerHTML =
        "<p style='color:#aaa;'>No playlists yet. Create one!</p>";
      return;
    }

    plNames.forEach((plName) => {
      const files = playlists[plName];
      const groupDiv = document.createElement("div");
      groupDiv.className = "pl-group";
      groupDiv.style.marginBottom = "5px";

      let titleIcon =
        plName === "Hidden Files" ? "fa-user-secret" : "fa-folder";
      let titleColor = plName === "Hidden Files" ? "#ff9800" : "#FFD700";
      let delBtnHtml =
        plName === "Hidden Files"
          ? `<span style="width:20px;"></span>`
          : `<button class="pl-del-btn" style="background:none; border:none; color:#ff5555; cursor:pointer;" title="Delete Playlist"><i class="fas fa-trash"></i></button>`;

      let isExpanded = window.expandedPlaylists.includes(plName);

      groupDiv.innerHTML = `
              <div class="pl-header" style="display:flex; justify-content:space-between; align-items:center; background:#333; padding:10px; border-radius:4px; cursor:pointer;">
                  <span style="font-weight:bold; color:white;"><i class="fas ${isExpanded ? (plName === "Hidden Files" ? "fa-user-secret" : "fa-folder-open") : titleIcon}" style="margin-right:8px; color:${titleColor};"></i> ${plName} <span style="color:#aaa; font-size:12px; font-weight:normal;">(${files.length})</span></span>
                  ${delBtnHtml}
              </div>
              <div class="pl-items" style="display:${isExpanded ? "block" : "none"}; padding: 10px 5px; border-left: 2px solid #555; margin-left: 10px; border-bottom: 1px solid #444;"></div>
          `;
      listContainer.appendChild(groupDiv);

      const header = groupDiv.querySelector(".pl-header");
      const content = groupDiv.querySelector(".pl-items");
      header.onclick = (e) => {
        if (e.target.closest(".pl-del-btn")) return;
        if (content.style.display === "none") {
          content.style.display = "block";
          if (!window.expandedPlaylists.includes(plName))
            window.expandedPlaylists.push(plName);
          header.querySelector("i").className =
            plName === "Hidden Files"
              ? "fas fa-user-secret"
              : "fas fa-folder-open";
        } else {
          content.style.display = "none";
          window.expandedPlaylists = window.expandedPlaylists.filter(
            (p) => p !== plName,
          );
          header.querySelector("i").className =
            plName === "Hidden Files" ? "fas fa-user-secret" : "fas fa-folder";
        }
      };

      if (plName !== "Hidden Files") {
        groupDiv.querySelector(".pl-del-btn").onclick = () => {
          sysConfirm(
            `Delete entire playlist: ${plName}?`,
            () => {
              delete playlists[plName];
              savePlaylists();
              window.expandedPlaylists = window.expandedPlaylists.filter(
                (p) => p !== plName,
              );
              renderPlaylistBoard();
            },
            "Delete Playlist",
            "confirm_del_playlist",
          );
        };
      }

      if (files.length === 0) {
        content.innerHTML =
          "<span style='color:#888; font-size:12px;'>Empty folder</span>";
      } else {
        files.forEach((safePath, idx) => {
          const name = safePath.split("/").pop();
          const uid = Math.random().toString(36).substr(2, 9);
          let item = document.createElement("div");
          item.className = "sfx-item";
          item.style.marginBottom = "8px";
          const pWaveId = "pl-wave-" + uid;

          item.innerHTML = `
                    <div class="sfx-info" style="align-items: center;">
                        <input type="checkbox" class="pl-bulk-cb" data-plname="${plName}" data-path="${safePath}" style="transform: scale(1.3); cursor: pointer; margin-right: 12px; accent-color: #ff5555;">
                        <div class="sfx-thumb" id="p-drag-icon-${uid}" draggable="true" style="cursor: pointer; background: #222; display: flex; justify-content: center; align-items: center;" title="${name}"><i class="fas fa-play" style="pointer-events: none; color: #fff;"></i></div>
                        <div class="sfx-details"><div class="sfx-name" draggable="true" style="cursor: grab;">${name}</div><p class="sfx-meta"><span id="p-time-${uid}">--:--</span></p></div>
                        <div class="sfx-actions">
                            <input type="range" id="p-vol-${uid}" min="0" max="1" step="0.05" value="1" title="Volume (Double click to reset)" style="width: 50px; margin-right: 8px; accent-color: #4fa5e6; cursor: pointer;">
                            <button class="btn-add" id="p-add-${uid}" title="Add to Target Track"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>
                    <div id="${pWaveId}" class="waveform-container" style="margin-left: 25px;"></div>`;
          content.appendChild(item);

          const ws = WaveSurfer.create({
            container: "#" + pWaveId,
            waveColor: "#666666",
            progressColor: "#ff5555",
            height: 30,
            barWidth: 2,
            barGap: 1,
            cursorWidth: 1,
          });
          plWavesurfers.push({ ws: ws, url: "file://" + safePath });

          const volSlider = item.querySelector(`#p-vol-${uid}`);
          volSlider.addEventListener("input", (e) => {
            ws.setVolume(parseFloat(e.target.value));
          });
          volSlider.addEventListener("dblclick", (e) => {
            e.target.value = 1;
            ws.setVolume(1);
          });

          const thumbBtn = item.querySelector(`#p-drag-icon-${uid}`);
          const thumbIcon = thumbBtn.querySelector("i");
          ws.on("interaction", () => ws.play());
          ws.on("play", () => {
            thumbIcon.className = "fas fa-pause";
            activeWavesurfers.forEach((obj) => {
              if (obj.ws !== ws) {
                if (obj.ws.isPlaying()) obj.ws.pause();
                obj.ws.seekTo(0);
              }
            });
            plWavesurfers.forEach((obj) => {
              if (obj.ws !== ws) {
                if (obj.ws.isPlaying()) obj.ws.pause();
                obj.ws.seekTo(0);
              }
            });
            usageWavesurfers.forEach((obj) => {
              if (obj.ws !== ws) {
                if (obj.ws.isPlaying()) obj.ws.pause();
                obj.ws.seekTo(0);
              }
            });
          });
          ws.on("pause", () => (thumbIcon.className = "fas fa-play"));
          ws.on("finish", () => {
            thumbIcon.className = "fas fa-play";
            ws.seekTo(0);
          });

          let isDragging = false;
          thumbBtn.addEventListener("dragstart", (e) => {
            isDragging = true;
            let osPath = safePath;
            if (navigator.appVersion.indexOf("Win") !== -1)
              osPath = osPath.replace(/\//g, "\\");
            e.dataTransfer.setData("com.adobe.cep.dnd.file.0", osPath);
          });
          thumbBtn.addEventListener("dragend", () =>
            setTimeout(() => (isDragging = false), 150),
          );
          thumbBtn.addEventListener("click", () => {
            if (!isDragging) ws.playPause();
          });
          ws.on("ready", () => {
            document.getElementById(`p-time-${uid}`).innerText = formatTime(
              ws.getDuration(),
            );
          });
          ws.load("file://" + safePath);

          item.querySelector(`#p-add-${uid}`).addEventListener("click", () => {
            const targetTrack = document.getElementById("track-val").value;
            if (!targetTrack) return sysAlert("Please select a Target Track.");
            csInterface.evalScript(
              `importAndAddToTimeline("${safePath.replace(/\//g, "\\\\")}", "${targetTrack}")`,
              (res) => {
                if (res === "Success")
                  sysAlert("Added!", "Success", "alert_add_pl_timeline_ok");
                else sysAlert(res, "Error");
              },
            );
          });
        });
      }
    });
  }

  // --- LOGIC TAG BOARD HIỆN TẠI ---
  function getSortedTags(sortType = "most") {
    let tagCounts = {};
    Object.values(sfxDatabase).forEach((item) => {
      (item.tags || []).forEach((t) => {
        let cleanTag = t.trim();
        if (cleanTag) tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
      });
    });
    let tagsArray = Object.keys(tagCounts).map((t) => ({
      name: t,
      count: tagCounts[t],
    }));
    if (sortType === "most") tagsArray.sort((a, b) => b.count - a.count);
    if (sortType === "az")
      tagsArray.sort((a, b) => a.name.localeCompare(b.name));
    if (sortType === "za")
      tagsArray.sort((a, b) => b.name.localeCompare(a.name));
    return tagsArray;
  }

  function renderTagBoard(sortType) {
    const grid = document.getElementById("tag-board-grid");
    grid.innerHTML = "";
    const tagSearchQuery =
      document.getElementById("tag-board-search")?.value.toLowerCase().trim() ||
      "";

    const btnDeselect = document.getElementById("btn-deselect-tags");
    const btnDelete = document.getElementById("btn-delete-tags");
    const hasActive = window.activeTags.length > 0;

    if (btnDeselect) {
      btnDeselect.style.opacity = hasActive ? "1" : "0.4";
      btnDeselect.style.pointerEvents = hasActive ? "auto" : "none";
    }
    if (btnDelete) {
      btnDelete.style.opacity = hasActive ? "1" : "0.4";
      btnDelete.style.pointerEvents = hasActive ? "auto" : "none";
    }

    let tagsToRender = getSortedTags(sortType);
    if (tagSearchQuery)
      tagsToRender = tagsToRender.filter((t) =>
        t.name.toLowerCase().includes(tagSearchQuery),
      );
    if (tagsToRender.length === 0) {
      grid.innerHTML =
        '<span style="color:#888; font-size:12px;">Không tìm thấy tag.</span>';
      return;
    }

    tagsToRender.forEach((t) => {
      const isSel = window.activeTags.includes(t.name);
      let btn = document.createElement("button");
      btn.innerHTML = `<span style="font-size: 11px;">${t.name}</span> <span style="background: #111; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 5px; color: #ccc;">${t.count}</span>`;
      let bg = isSel ? "#4fa5e6" : "#333";
      let border = isSel ? "1px solid #4fa5e6" : "1px solid #444";
      btn.style.cssText = `padding: 5px 10px; background: ${bg}; color: #eee; border: ${border}; border-radius: 15px; cursor: pointer; display: flex; align-items: center; transition: 0.2s;`;
      btn.onclick = () => {
        if (isSel) {
          window.activeTags = window.activeTags.filter((tg) => tg !== t.name);
        } else {
          window.activeTags.push(t.name);
        }
        renderTagBoard(document.getElementById("tag-sort-select").value);
        loadSoundsAndRender(false);
      };
      grid.appendChild(btn);
    });

    const toggleBtn = document.getElementById("btn-toggle-tags");
    if (toggleBtn) {
      setTimeout(() => {
        if (grid.scrollHeight > 45) {
          toggleBtn.style.display = "inline-block";
          if (!grid.style.maxHeight) grid.style.maxHeight = "250px";
          toggleBtn.innerHTML =
            grid.style.maxHeight === "35px"
              ? '<i class="fas fa-chevron-down"></i>'
              : '<i class="fas fa-chevron-up"></i>';
          toggleBtn.onclick = () => {
            if (grid.style.maxHeight === "250px") {
              grid.style.maxHeight = "35px";
              grid.style.overflowY = "hidden";
              toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
            } else {
              grid.style.maxHeight = "250px";
              grid.style.overflowY = "auto";
              toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
            }
          };
        } else {
          toggleBtn.style.display = "none";
          grid.style.maxHeight = "250px";
          grid.style.overflowY = "auto";
        }
      }, 50);
    }
  }

  if (document.getElementById("tag-board-search"))
    document
      .getElementById("tag-board-search")
      .addEventListener("input", () =>
        renderTagBoard(document.getElementById("tag-sort-select").value),
      );
  if (document.getElementById("btn-open-tags"))
    document.getElementById("btn-open-tags").onclick = () => {
      const b = document.getElementById("inline-tag-board");
      if (b.style.display === "none" || b.style.display === "") {
        b.style.display = "block";
        renderTagBoard(document.getElementById("tag-sort-select").value);
      } else b.style.display = "none";
    };
  if (document.getElementById("btn-close-board"))
    document.getElementById("btn-close-board").onclick = () =>
      (document.getElementById("inline-tag-board").style.display = "none");
  if (document.getElementById("tag-sort-select"))
    document.getElementById("tag-sort-select").onchange = (e) =>
      renderTagBoard(e.target.value);

  if (document.getElementById("btn-deselect-tags")) {
    document.getElementById("btn-deselect-tags").onclick = () => {
      window.activeTags = [];
      renderTagBoard(document.getElementById("tag-sort-select").value);
      loadSoundsAndRender(false);
    };
  }
  if (document.getElementById("btn-delete-tags")) {
    document.getElementById("btn-delete-tags").onclick = () => {
      if (window.activeTags.length > 0) {
        sysConfirm(
          `Are you sure you want to permanently delete ${window.activeTags.length} selected tags from ALL sounds?`,
          () => {
            window.activeTags.forEach((t) => {
              Object.values(sfxDatabase).forEach((dbItem) => {
                if (dbItem.tags)
                  dbItem.tags = dbItem.tags.filter((tag) => tag !== t);
              });
            });
            saveDB();
            window.activeTags = [];
            renderTagBoard(document.getElementById("tag-sort-select").value);
            loadSoundsAndRender(false);
          },
          "Delete Tags",
          "confirm_del_multi_tags",
        );
      }
    };
  }

  document.body.addEventListener("dblclick", function (e) {
    let target = e.target;
    if (target.classList.contains("tag-badge")) {
      const filePath = target.getAttribute("data-path");
      const oldTag = target.getAttribute("data-tag");
      if (!filePath || !oldTag || target.querySelector(".edit-tag-input"))
        return;
      target.innerHTML = `<input type="text" class="edit-tag-input" value="${oldTag}" style="width: 70px; background: #111; color: white; border: 1px solid #555; padding: 2px 4px; font-size: 11px; outline: none; border-radius: 3px;">`;
      const inputEl = target.querySelector(".edit-tag-input");
      inputEl.focus();
      inputEl.select();
      const finishEdit = () => {
        const newTag = inputEl.value.trim();
        if (
          newTag &&
          newTag !== oldTag &&
          !/[!@#$%^&*(),.?":{}|<>\/\\]/.test(newTag)
        ) {
          const tagIndex = sfxDatabase[filePath].tags.indexOf(oldTag);
          if (tagIndex !== -1) {
            sfxDatabase[filePath].tags[tagIndex] = newTag;
            saveDB();
          }
          target.setAttribute("data-tag", newTag);
          target.innerHTML = `${newTag} <i class="fas fa-times tag-delete" data-path="${filePath}" data-tag="${newTag}"></i>`;
          renderTagBoard(document.getElementById("tag-sort-select").value);
        } else {
          target.innerHTML = `${oldTag} <i class="fas fa-times tag-delete" data-path="${filePath}" data-tag="${oldTag}"></i>`;
        }
      };
      inputEl.addEventListener("blur", finishEdit);
      inputEl.addEventListener("keypress", (ev) => {
        if (ev.key === "Enter") {
          inputEl.removeEventListener("blur", finishEdit);
          finishEdit();
        }
      });
    }
  });

  document.body.addEventListener("click", function (e) {
    if (e.target.classList.contains("tag-delete")) {
      const filePath = e.target.getAttribute("data-path"),
        tagToRemove = e.target.getAttribute("data-tag");
      sfxDatabase[filePath].tags = sfxDatabase[filePath].tags.filter(
        (t) => t !== tagToRemove,
      );
      saveDB();
      e.target.parentElement.remove();
      renderTagBoard(document.getElementById("tag-sort-select").value);
    }
    if (e.target.classList.contains("jump-link")) {
      csInterface.evalScript(
        `jumpToSequenceTime("${e.target.getAttribute("data-seq")}", "${e.target.getAttribute("data-time")}", "${e.target.getAttribute("data-file")}")`,
        (res) => {
          if (res === "MISSING")
            sysAlert(
              "Audio modified or missing from sequence. Sync to update.",
            );
        },
      );
    }
  });

  // EXPORT & LOAD
  if (document.getElementById("btn-export-data")) {
    document.getElementById("btn-export-data").addEventListener("click", () => {
      const fullData = {
        db: sfxDatabase,
        settings: settings,
        playlists: playlists,
        history: searchHistory,
      };
      const dataStr = JSON.stringify(fullData, null, 2);
      const dateStr = new Date().toISOString().split("T")[0];
      const defaultName = `SoundManager_Backup_${dateStr}.json`;
      if (window.cep && window.cep.fs) {
        const result = window.cep.fs.showSaveDialogEx(
          "Save Backup",
          "",
          ["json"],
          defaultName,
          "Choose where to save your backup",
        );
        if (result.data) {
          const writeResult = window.cep.fs.writeFile(result.data, dataStr);
          if (writeResult.err === window.cep.fs.NO_ERROR)
            sysAlert("Exported successfully!", "Success", "alert_export_ok");
        }
      }
    });
  }
  if (document.getElementById("btn-load-data"))
    document
      .getElementById("btn-load-data")
      .addEventListener("click", () =>
        document.getElementById("input-load-data").click(),
      );
  if (document.getElementById("input-load-data")) {
    document
      .getElementById("input-load-data")
      .addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const importedData = JSON.parse(event.target.result);
            if (importedData.db)
              localStorage.setItem("sfx_db", JSON.stringify(importedData.db));
            if (importedData.settings)
              localStorage.setItem(
                "sfx_settings",
                JSON.stringify(importedData.settings),
              );
            if (importedData.playlists)
              localStorage.setItem(
                "sfx_playlists",
                JSON.stringify(importedData.playlists),
              );
            if (importedData.history)
              localStorage.setItem(
                "sfx_search_history",
                JSON.stringify(importedData.history),
              );
            sysAlert(
              "Data loaded successfully! Reloading.",
              "Success",
              "alert_load_ok",
            );
            setTimeout(() => location.reload(), 1500);
          } catch (err) {
            sysAlert("Invalid backup file!", "Error");
          }
        };
        reader.readAsText(file);
        e.target.value = "";
      });
  }

  // CÁC HÀM CÀI ĐẶT
  function syncSettingsToUI() {
    const folderList = document.getElementById("folder-list");
    folderList.innerHTML = "";
    if (settings.folders.length === 0) addFolderInput("");
    else settings.folders.forEach((folder) => addFolderInput(folder));
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
    div.innerHTML = `<input type="text" class="folder-path" value="${value}" placeholder="e.g., C:/Sounds or D:/SFX"><button class="btn-remove-folder"><i class="fas fa-minus"></i></button>`;
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
  document
    .getElementById("close-settings")
    .addEventListener("click", () => settingsModal.classList.add("hidden"));
  document
    .getElementById("btn-add-folder")
    .addEventListener("click", () => addFolderInput(""));
  document.getElementById("btn-save-settings").addEventListener("click", () => {
    const newFolders = Array.from(document.querySelectorAll(".folder-path"))
      .map((input) => input.value.trim().replace(/\\/g, "/"))
      .filter((val) => val !== "");
    const foldersChanged =
      JSON.stringify(settings.folders) !== JSON.stringify(newFolders);
    settings.folders = newFolders;
    settings.showTags = document.getElementById("check-show-tags").checked;
    settings.showSeq = document.getElementById("check-show-seq").checked;
    settings.showSeqTime = document.getElementById(
      "check-show-seq-time",
    ).checked;
    settings.showAllFiles = document.getElementById(
      "check-show-all-files",
    ).checked;
    saveSettings();
    settingsModal.classList.add("hidden");
    if (foldersChanged) {
      scanFilesFromDisk();
    }
    loadSoundsAndRender(true, searchInput.value);
  });

  if (document.getElementById("btn-clear-all")) {
    document.getElementById("btn-clear-all").addEventListener("click", () => {
      sysConfirm(
        "CRITICAL WARNING: Are you sure you want to clear ALL memory data (Database, Settings, Playlists, Warnings)?\n\nThis action CANNOT be undone!",
        () => {
          localStorage.clear();
          sysAlert(
            "Memory cleared successfully! Reloading extension...",
            "Success",
            "alert_mem_clear_ok",
          );
          setTimeout(() => location.reload(), 1500);
        },
        "Clear Memory",
        "confirm_clear_memory",
      );
    });
  }

  document.getElementById("btn-refresh").addEventListener("click", () => {
    settingsModal.classList.add("hidden");
    scanFilesFromDisk();
    loadSoundsAndRender(true);
  });

  syncSettingsToUI();
  scanFilesFromDisk();
  loadSoundsAndRender(false);
});
