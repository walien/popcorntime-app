<img class="icon-begin" src="<%=App.Settings.get('theme_path')%>/assets/images/icon.png">
<img class="init-icon-title" src="<%=App.Settings.get('theme_path')%>/assets/images/icons/big-logo.png">
<div class="init-geek-line">
	<%= i18n.__("Made with") %> <span style="color:#e74c3c;">&#10084;</span> <%= i18n.__("by a bunch of geeks from All Around The World") %>
</div>
<div class="text-begin">
	<div class="init-text"><%= i18n.__("Initializing PopcornTime. Please Wait...") %></div>
	<div class="init-progressbar">
		<div id="initbar-contents"></div>
	</div>
	<div id="init-status" class="init-status"></div>
</div>
