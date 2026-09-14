<template>
  <v-container fluid class="cast-view pa-3">
    <v-alert v-if="!loadingUser && !hasAccess" type="error" class="mb-4">
      {{ $t("Cast.AccessDenied") }}
    </v-alert>

    <template v-if="!loadingUser && hasAccess">
      <v-row class="mb-2" align="center">
        <v-col>
          <h2>
            <v-icon left color="teal">mdi-broadcast</v-icon>
            {{ $t("Cast.Title") }}
          </h2>
        </v-col>
        <v-col cols="auto">
          <v-chip :color="connected ? 'teal' : 'grey'" small dark>
            <v-icon left small>{{
              connected ? "mdi-wifi" : "mdi-wifi-off"
            }}</v-icon>
            {{ connected ? $t("Cast.Connected") : $t("Cast.Disconnected") }}
          </v-chip>
        </v-col>
      </v-row>

      <v-row no-gutters class="layout-row">
        <!-- Left column: matches -->
        <v-col cols="8" class="pr-2 tables-col">
          <v-card class="mb-3">
            <v-card-title class="subtitle-1 py-2 primary white--text">
              <v-icon left small dark>mdi-play-circle</v-icon>
              {{ $t("Cast.ActiveMatches") }}
              <v-chip x-small class="ml-2" color="green" dark>{{
                activeMatches.length
              }}</v-chip>
            </v-card-title>
            <v-simple-table dense v-if="activeMatches.length">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{{ $t("Matches.Team1") }}</th>
                  <th class="text-center">{{ $t("Cast.Series") }}</th>
                  <th>{{ $t("Matches.Team2") }}</th>
                  <th
                    v-for="n in maxMapColumns"
                    :key="'ah' + n"
                    class="text-center"
                  >
                    {{ $t("GlobalStats.Map") }} {{ n }}
                  </th>
                  <th class="text-center">{{ $t("Cast.Connection") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="match in activeMatches" :key="match.id">
                  <td>
                    <router-link
                      :to="'/match/' + match.id"
                      class="teal--text font-weight-bold"
                    >
                      #{{ match.id }}
                    </router-link>
                  </td>
                  <td class="font-weight-medium">{{ match.team1_string }}</td>
                  <td class="text-center">
                    <span class="font-weight-bold">
                      {{ match.team1_series_score }} -
                      {{ match.team2_series_score }}
                    </span>
                    <span class="grey--text caption ml-1"
                      >BO{{ match.max_maps }}</span
                    >
                  </td>
                  <td class="font-weight-medium">{{ match.team2_string }}</td>
                  <td
                    v-for="n in maxMapColumns"
                    :key="'am' + n"
                    class="text-center"
                  >
                    <template v-if="match.maps[n - 1]">
                      <div class="caption font-weight-bold">
                        {{ mapDisplayName(match.maps[n - 1].map) }}
                      </div>
                      <div
                        class="caption"
                        :class="match.maps[n - 1].started ? '' : 'grey--text'"
                      >
                        {{
                          match.maps[n - 1].started
                            ? match.maps[n - 1].team1_score +
                              " - " +
                              match.maps[n - 1].team2_score
                            : "- -"
                        }}
                      </div>
                    </template>
                    <span v-else class="grey--text">-</span>
                  </td>
                  <td class="text-center">
                    <div class="d-flex flex-column" style="gap: 2px">
                      <v-btn
                        x-small
                        dark
                        color="blue darken-2"
                        :href="connectUrl(match, 'server')"
                        target="_blank"
                      >
                        <v-icon x-small left>mdi-server</v-icon>
                        {{ $t("Cast.Server") }}
                      </v-btn>
                      <v-btn
                        x-small
                        dark
                        color="indigo"
                        :href="connectUrl(match, 'tv90')"
                        target="_blank"
                      >
                        <v-icon x-small left>mdi-television-play</v-icon>
                        {{ $t("Cast.TV90") }}
                      </v-btn>
                      <v-btn
                        x-small
                        dark
                        color="deep-purple"
                        @click="copyConnectText(match)"
                      >
                        <v-icon x-small left>mdi-content-copy</v-icon>
                        {{ $t("Cast.TV0") }}
                      </v-btn>
                    </div>
                  </td>
                </tr>
              </tbody>
            </v-simple-table>
            <v-card-text v-else class="grey--text text-center">
              {{ $t("Cast.NoActiveMatches") }}
            </v-card-text>
          </v-card>

          <v-card>
            <v-card-title class="subtitle-1 py-2">
              <v-icon left small>mdi-check-circle</v-icon>
              {{ $t("Cast.FinishedMatches") }}
              <v-chip x-small class="ml-2">{{ finishedMatches.length }}</v-chip>
            </v-card-title>
            <v-simple-table dense v-if="finishedMatches.length">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{{ $t("Matches.Team1") }}</th>
                  <th class="text-center">{{ $t("Cast.Series") }}</th>
                  <th>{{ $t("Matches.Team2") }}</th>
                  <th
                    v-for="n in maxMapColumns"
                    :key="'fh' + n"
                    class="text-center"
                  >
                    {{ $t("GlobalStats.Map") }} {{ n }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="match in finishedMatches" :key="match.id">
                  <td>
                    <router-link
                      :to="'/match/' + match.id"
                      class="grey--text text--lighten-1 font-weight-bold"
                    >
                      #{{ match.id }}
                    </router-link>
                  </td>
                  <td>{{ match.team1_string }}</td>
                  <td class="text-center">
                    <span class="font-weight-bold">
                      {{ match.team1_series_score }} -
                      {{ match.team2_series_score }}
                    </span>
                    <span class="grey--text caption ml-1"
                      >BO{{ match.max_maps }}</span
                    >
                  </td>
                  <td>{{ match.team2_string }}</td>
                  <td
                    v-for="n in maxMapColumns"
                    :key="'fm' + n"
                    class="text-center"
                  >
                    <template v-if="match.maps[n - 1]">
                      <div class="caption font-weight-bold">
                        {{ mapDisplayName(match.maps[n - 1].map) }}
                      </div>
                      <div class="caption grey--text">
                        {{ match.maps[n - 1].team1_score }} -
                        {{ match.maps[n - 1].team2_score }}
                      </div>
                    </template>
                    <span v-else class="grey--text">-</span>
                  </td>
                </tr>
              </tbody>
            </v-simple-table>
            <v-card-text v-else class="grey--text text-center">
              {{ $t("Cast.NoFinishedMatches") }}
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Right column: event feed -->
        <v-col cols="4" class="event-col">
          <v-card class="event-sidebar">
            <v-card-title class="subtitle-1 py-2">
              <v-icon left small>mdi-timeline-clock</v-icon>
              {{ $t("Cast.EventFeed") }}
            </v-card-title>
            <v-divider />
            <div class="event-log" ref="eventLog">
              <div
                v-if="events.length === 0"
                class="text-center grey--text pa-4"
              >
                {{ $t("Cast.NoEvents") }}
              </div>
              <v-list dense class="transparent py-0">
                <v-list-item
                  v-for="(ev, i) in events"
                  :key="i"
                  class="event-item py-1"
                  :class="eventClass(ev.event_type)"
                  dense
                >
                  <v-list-item-icon class="my-auto mr-2">
                    <v-icon small :color="eventColor(ev.event_type)">{{
                      eventIcon(ev.event_type)
                    }}</v-icon>
                  </v-list-item-icon>
                  <v-list-item-content>
                    <v-list-item-title
                      class="body-2"
                      style="white-space: normal; word-break: break-word"
                    >
                      {{ formatEventLabel(ev) }}
                      <router-link
                        :to="'/match/' + ev.match_id"
                        class="ml-1 grey--text text--lighten-1"
                        style="font-size: 11px"
                        >#{{ ev.match_id }}</router-link
                      >
                    </v-list-item-title>
                    <v-list-item-subtitle class="caption grey--text">
                      {{ formatTime(ev.event_time) }}
                    </v-list-item-subtitle>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <v-snackbar
      v-model="copySnackbar"
      :color="copySnackbarColor"
      timeout="3000"
    >
      {{ copyMessage }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { getMapDisplayName } from "../utils/mapNames";
export default {
  name: "CastView",
  data() {
    return {
      user: { id: null, admin: 0, super_admin: 0, cast: 0 },
      loadingUser: true,
      connected: false,
      events: [],
      activeMatches: [],
      finishedMatches: [],
      sseClient: null,
      copySnackbar: false,
      copyMessage: "",
      copySnackbarColor: "success"
    };
  },
  computed: {
    hasAccess() {
      return (
        Number(this.user.cast) === 1 ||
        Number(this.user.admin) === 1 ||
        Number(this.user.super_admin) === 1
      );
    },
    // BO1/BO3 are the common case, but max_maps can go higher (BO5, BO7...) -
    // size the map columns off the widest series actually shown instead of a
    // hard-coded 3, or the extra maps would silently be omitted.
    maxMapColumns() {
      const maxOf = matches =>
        matches.reduce((acc, m) => Math.max(acc, Number(m.max_maps) || 0), 0);
      return Math.max(
        maxOf(this.activeMatches),
        maxOf(this.finishedMatches),
        1
      );
    }
  },
  async mounted() {
    this.user = await this.IsLoggedIn();
    this.loadingUser = false;
    if (this.hasAccess) {
      await this.connectSSE();
    }
  },
  beforeDestroy() {
    if (this.sseClient) {
      this.sseClient.disconnect();
    }
  },
  methods: {
    mapDisplayName(mapId) {
      return getMapDisplayName(mapId);
    },
    async connectSSE() {
      this.sseClient = await this.GetCastStream();
      if (!this.sseClient) return;
      // Register handlers before connecting - the server sends its initial
      // snapshot as soon as the connection opens, so listening only after
      // connect() resolves can miss it and leave the dashboard empty.
      this.sseClient.on("castData", data => {
        this.events = data.events || [];
        this.activeMatches = data.activeMatches || [];
        this.finishedMatches = data.finishedMatches || [];
      });
      this.sseClient.on("error", () => {
        this.connected = false;
      });
      await this.sseClient.connect();
      this.connected = true;
    },

    connectUrl(match, type) {
      const ip = match.ip_cast || match.ip_string;
      const steamId = this.user.steam_id;
      if (!ip || !steamId) return "#";
      const base = `steam://rungame/730/${steamId}/`;
      if (type === "server") {
        return `${base}+connect%20${ip}:${match.port}`;
      }
      if (!match.gotv_port) return "#";
      return `${base}+connect%20${ip}:${match.gotv_port}`;
    },

    gotvConnectText(match) {
      const ip = match.ip_cast || match.ip_string;
      if (!ip || !match.gotv_port) return "";
      return `connect ${ip}:${match.gotv_port}`;
    },

    legacyCopyToClipboard(text) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      const succeeded = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (!succeeded) throw new Error("execCommand copy failed");
    },

    async copyConnectText(match) {
      const text = this.gotvConnectText(match);
      if (!text) return;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          this.legacyCopyToClipboard(text);
        }
        this.copyMessage = this.$t("Cast.CopySuccess", { text });
        this.copySnackbarColor = "success";
      } catch (error) {
        void error;
        this.copyMessage = this.$t("Cast.CopyFailed");
        this.copySnackbarColor = "error";
      }
      this.copySnackbar = true;
    },

    eventIcon(type) {
      const icons = {
        match_created: "mdi-sword-cross",
        map_end: "mdi-flag-checkered",
        match_end: "mdi-trophy"
      };
      return icons[type] || "mdi-circle";
    },

    eventColor(type) {
      const colors = {
        match_created: "blue lighten-2",
        map_end: "orange",
        match_end: "teal"
      };
      return colors[type] || "grey";
    },

    eventClass(type) {
      const classes = {
        match_created: "event-created",
        map_end: "event-map-end",
        match_end: "event-match-end"
      };
      return classes[type] || "";
    },

    formatEventLabel(ev) {
      if (ev.event_type === "match_created") {
        return this.$t("Cast.EventMatchCreated", {
          id: ev.match_id,
          team1: ev.team1,
          team2: ev.team2
        });
      }
      if (ev.event_type === "map_end") {
        return this.$t("Cast.EventMapEnd", {
          map: this.mapDisplayName(ev.map_name),
          team1: ev.team1,
          score1: ev.team1_score,
          score2: ev.team2_score,
          team2: ev.team2
        });
      }
      if (ev.event_type === "match_end") {
        return this.$t("Cast.EventMatchEnd", {
          team1: ev.team1,
          score1: ev.team1_series,
          score2: ev.team2_series,
          team2: ev.team2
        });
      }
      return ev.event_type;
    },

    formatTime(ts) {
      if (!ts) return "";
      const d = new Date(ts);
      if (isNaN(d)) return ts;
      return d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  }
};
</script>

<style scoped>
.layout-row {
  align-items: flex-start;
}
.tables-col {
  min-width: 0;
}
.event-col {
  position: sticky;
  top: 64px;
  align-self: flex-start;
}
.event-sidebar {
  max-height: calc(100vh - 90px);
  display: flex;
  flex-direction: column;
}
.event-log {
  flex: 1;
  overflow-y: auto;
}
.event-item {
  border-bottom: 1px solid rgba(128, 128, 128, 0.2);
}
.event-created {
  border-left: 3px solid #42a5f5;
}
.event-map-end {
  border-left: 3px solid #ffa726;
}
.event-match-end {
  border-left: 3px solid #26a69a;
}
</style>
