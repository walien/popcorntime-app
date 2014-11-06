<div class="player-header-background vjs-control-bar">
	<div class="player-title"></div>
	<div class="details-player">

		<span class="quality-info-player"></span>

		<span class="fa fa-times close-info-player"></span>
		<div class="download-info-player">
			<i class="fa fa-eye eye-info-player"></i>
			<div class="details-info-player">
				<div class="arrow-up"></div>
				<span class="speed-info-player"><%= i18n.__("Download") %>:&nbsp;</span><span class="download_speed_player">0 B/s</span><br>
				<span class="speed-info-player"><%= i18n.__("Upload") %>:&nbsp;</span><span class="upload_speed_player">0 B/s</span><br>
				<span class="speed-info-player"><%= i18n.__("Active Peers") %>:&nbsp;</span><span class="active_peers_player">0</span>
				<span class="speed-info-player"><%= i18n.__("Completed") %>:&nbsp;</span><span class="percent_completed">0%</span>
			</div>
		</div>
	</div>
</div>

<div class="playing_next vjs-control-window">
	<p><%= i18n.__("Playing Next Episode in") %>: <span id="nextCountdown">60</span>
	</p>
	<div class="auto-next-btn playnownext"><%= i18n.__("Play Now") %></div>
</div>
<%
   var subtracks = "";
   var subArray = [];
   for (var lang in subtitle) {
	   var langcode = lang == "pb"? "pt-br" : lang;
	   subArray.push({
	   "language": langcode,
	   "languageName": (App.Localization.langcodes[langcode] !== undefined ? App.Localization.langcodes[langcode].nativeName : langcode),
	   "sub": subtitle[lang]
	   });
    }
    subArray.sort(function (sub1, sub2) {
   		return sub1.language > sub2.language;
	});

	var defaultSub = "none";
	if (typeof defaultSubtitle != "undefined") {
		defaultSub = defaultSubtitle;
	}
	for(var index in subArray ) {
		var imDefault = "";

		if(defaultSub == subArray[index].language)
		imDefault = "default";

		subtracks += '<track kind="subtitles" src="' + subArray[index].sub + '" srclang="'+ subArray[index].language +'" label="' + subArray[index].languageName + '" charset="utf-8" '+ imDefault +' />';
	}
%>
<video id="video_player" width="100%" height="100%" class="video-js vjs-popcorn-skin" controls preload="auto" autoplay >
<%
	if (type === 'trailer') { var src = trailerSrc; }
	else { var src = App.Streamer.getStreamUrl();	}
%>
	<source src="<%= src %>" type="<%= videotype %>" />
	<%=subtracks%>
</video>
