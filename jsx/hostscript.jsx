function getAvailableAudioTracks() {
  try {
    var project = app.project;
    if (!project) return "";
    var seq = project.activeSequence;
    if (!seq) return "";
    var tracks = [];
    var audioTracks = seq.audioTracks;
    if (!audioTracks) return "";
    for (var i = 0; i < audioTracks.numTracks; i++) {
      var track = audioTracks[i];
      if (track) {
        var isLock = false;
        try {
          isLock = track.isLocked();
        } catch (e) {}
        if (!isLock) tracks.push("A" + (i + 1));
      }
    }
    return tracks.join(",");
  } catch (e) {
    return "ERR:" + e.message;
  }
}

function importAndAddToTimeline(filePath, trackName) {
  try {
    var project = app.project;
    if (!project) return "Error: No active project found.";
    var seq = project.activeSequence;
    if (!seq) return "Error: No active sequence.";
    var trackIndex = parseInt(trackName.replace("A", ""), 10) - 1;
    if (isNaN(trackIndex)) trackIndex = 0;
    if (trackIndex < 0 || trackIndex >= seq.audioTracks.numTracks)
      return "Error: Target track does not exist.";
    var track = seq.audioTracks[trackIndex];
    if (track.isLocked()) return "Error: Target track is locked.";
    var importResults = project.importFiles(
      [filePath],
      true,
      project.getInsertionBin(),
      false,
    );
    if (importResults) {
      var bin = project.getInsertionBin();
      var importedItem = null;
      var fileName = filePath.split("\\").pop().split("/").pop();
      for (var i = 0; i < bin.children.numItems; i++) {
        if (bin.children[i].name === fileName) importedItem = bin.children[i];
      }
      if (importedItem) {
        var time = seq.getPlayerPosition();
        track.insertClip(importedItem, time);
        return "Success";
      }
    }
    return "Error: File import failed.";
  } catch (e) {
    return "JSX Error: " + e.message;
  }
}

function revealFileInExplorer(filePath) {
  try {
    var file = new File(filePath);
    if (file.exists) {
      file.parent.execute();
      return "Success";
    }
    return "Error: File not found on disk.";
  } catch (e) {
    return "Error: " + e.message;
  }
}

function findSequencesForFile(filePath) {
  try {
    var result = [];
    var project = app.project;
    if (!project) return "";
    var targetName = new File(filePath).name;
    for (var i = 0; i < project.sequences.numSequences; i++) {
      var seq = project.sequences[i];
      for (var t = 0; t < seq.audioTracks.numTracks; t++) {
        var track = seq.audioTracks[t];
        for (var c = 0; c < track.clips.numItems; c++) {
          var clip = track.clips[c];
          var isMatch = false;
          if (clip.name === targetName) isMatch = true;
          else if (clip.projectItem && clip.projectItem.name === targetName)
            isMatch = true;
          if (isMatch) {
            var secs = clip.start.seconds;
            var m = Math.floor(secs / 60);
            var s = Math.floor(secs % 60);
            var timeStr = (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
            result.push(seq.name + "|" + timeStr);
          }
        }
      }
    }
    var uniqueResult = [];
    for (var k = 0; k < result.length; k++) {
      var isDup = false;
      for (var j = 0; j < uniqueResult.length; j++) {
        if (uniqueResult[j] === result[k]) {
          isDup = true;
          break;
        }
      }
      if (!isDup) uniqueResult.push(result[k]);
    }
    return uniqueResult.join(",");
  } catch (e) {
    return "";
  }
}

function getAllAudioUsages() {
  try {
    var project = app.project;
    if (!project) return "";
    var result = [];
    for (var i = 0; i < project.sequences.numSequences; i++) {
      var seq = project.sequences[i];
      for (var t = 0; t < seq.audioTracks.numTracks; t++) {
        var track = seq.audioTracks[t];
        for (var c = 0; c < track.clips.numItems; c++) {
          var clip = track.clips[c];
          var cName = clip.name;
          if (!cName && clip.projectItem) cName = clip.projectItem.name;
          if (cName) {
            var secs = clip.start.seconds;
            var m = Math.floor(secs / 60);
            var s = Math.floor(secs % 60);
            var timeStr = (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
            result.push(cName + "|" + seq.name + "|" + timeStr);
          }
        }
      }
    }
    return result.join("|||");
  } catch (e) {
    return "";
  }
}

function jumpToSequenceTime(seqName, timeStr, fileName) {
  try {
    var project = app.project;
    if (!project) return "Error: Project is not open.";
    var timeParts = timeStr.split(":");
    var targetSecs =
      parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);
    var targetSeq = null;
    for (var i = 0; i < project.sequences.numSequences; i++) {
      if (project.sequences[i].name === seqName) {
        targetSeq = project.sequences[i];
        break;
      }
    }
    if (!targetSeq) return "MISSING";

    var foundClip = null;
    for (var t = 0; t < targetSeq.audioTracks.numTracks; t++) {
      var track = targetSeq.audioTracks[t];
      for (var c = 0; c < track.clips.numItems; c++) {
        var clip = track.clips[c];
        var cName = clip.name;
        if (!cName && clip.projectItem) cName = clip.projectItem.name;
        if (cName === fileName) {
          if (Math.abs(clip.start.seconds - targetSecs) < 1.5) {
            foundClip = clip;
            break;
          }
        }
      }
      if (foundClip) break;
    }
    if (!foundClip) return "MISSING";

    project.activeSequence = targetSeq;
    targetSeq.setPlayerPosition(targetSecs.toString());

    try {
      var aTracks = targetSeq.audioTracks;
      for (var tr = 0; tr < aTracks.numTracks; tr++) {
        for (var cl = 0; cl < aTracks[tr].clips.numItems; cl++) {
          aTracks[tr].clips[cl].setSelected(false, 0);
        }
      }
      foundClip.setSelected(true, 1);
    } catch (err) {}

    return "SUCCESS";
  } catch (e) {
    return "Error: " + e.message;
  }
}

function renameFile(oldPath, newName) {
  try {
    var file = new File(oldPath);
    if (!file.exists) return "Error: File not found.";
    var success = file.rename(newName);
    if (success) return "Success";
    return "Error: Could not rename file. It might be in use by Premiere or Windows.";
  } catch (e) {
    return "Error: " + e.message;
  }
}
