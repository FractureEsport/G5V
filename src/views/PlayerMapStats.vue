<template>
  <v-container fluid>
    <v-card class="mb-4">
      <v-card-title>
        <v-icon x-large class="mr-3">mdi-account-circle</v-icon>
        <span class="text-h5">{{ playerName }}</span>
        <a
          v-if="steamId"
          :href="`https://steamcommunity.com/profiles/${steamId}`"
          target="_blank"
          class="ml-2"
          style="text-decoration: none"
        >
          <v-icon color="primary">mdi-steam</v-icon>
        </a>
      </v-card-title>
      <v-card-text class="pb-0">
        <v-btn text small :to="'/stats/player/' + steamId">
          <v-icon left small>mdi-chart-line</v-icon>
          {{ $t("GlobalStats.GlobalStats") }}
        </v-btn>
        <v-btn
          text
          small
          color="primary"
          :to="'/stats/player/' + steamId + '/maps'"
        >
          <v-icon left small>mdi-map</v-icon>
          {{ $t("GlobalStats.MapStats") }}
        </v-btn>
        <v-btn text small :to="'/stats/player/' + steamId + '/weapons'">
          <v-icon left small>mdi-pistol</v-icon>
          {{ $t("GlobalStats.WeaponStats") }}
        </v-btn>
      </v-card-text>
    </v-card>

    <div v-if="isLoading">
      <v-skeleton-loader type="table" />
    </div>

    <v-alert v-else-if="mapStats.length === 0" type="info">
      {{ $t("PlayerStats.NoPlayerStatFound") }}
    </v-alert>

    <v-card v-else>
      <v-card-title class="primary white--text">
        <v-icon left dark>mdi-map</v-icon>
        {{ $t("GlobalStats.MapStats") }}
      </v-card-title>

      <!-- Per-map summary cards -->
      <v-card-text class="pt-4">
        <v-row>
          <v-col
            v-for="stat in mapStats"
            :key="stat.map_name"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card outlined>
              <v-card-title class="text-subtitle-1 font-weight-bold py-2">
                {{ stat.map_display_name }}
              </v-card-title>
              <v-card-text>
                <div class="d-flex justify-space-between text-caption mb-1">
                  <span
                    >{{ stat.maps }}
                    {{ $t("GlobalStats.Maps").toLowerCase() }}</span
                  >
                  <span>K/D: {{ stat.kd }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption mb-1">
                  <span>{{ $t("PlayerStats.Kills") }}: {{ stat.kills }}</span>
                  <span>{{ $t("PlayerStats.Deaths") }}: {{ stat.deaths }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption mb-2">
                  <span>ADR: {{ stat.adr }}</span>
                  <span
                    >{{ $t("PlayerStats.Headshot") }}%: {{ stat.hsp }}%</span
                  >
                </div>
                <div class="text-caption mb-1 font-weight-medium">
                  {{ $t("GlobalStats.Rounds") }}: {{ stat.rounds }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />

      <!-- Detailed table -->
      <v-data-table
        :headers="headers"
        :items="mapStats"
        sort-by="kills"
        :sort-desc="true"
        :items-per-page="15"
        class="elevation-0"
      >
        <template v-slot:item.map_name="{ item }">{{
          item.map_display_name
        }}</template>
        <template v-slot:item.hsp="{ item }">{{ item.hsp }}%</template>
        <template v-slot:item.rating="{ item }">
          <strong>{{ item.rating.toFixed(2) }}</strong>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script>
import { getMapDisplayName } from "../utils/mapNames";
export default {
  name: "PlayerMapStats",
  data() {
    return {
      rawStats: [],
      // steam id -> technical map id, keyed by the map_stats row id since
      // player_stats only stores map_id (the map_stats.id foreign key).
      mapIdLookup: {},
      // Custom display names (typically for Workshop maps), merged from every
      // season any of this player's matches belongs to.
      seasonMapNames: {},
      isLoading: true
    };
  },
  async created() {
    try {
      const steamId = this.$route.params.steam_id;
      const res = await this.GetUserPlayerStats(steamId);
      if (!Array.isArray(res)) return;
      this.rawStats = res;

      // Fetch map names and season id for each unique match_id
      const matchIds = [...new Set(res.map(s => s.match_id))];
      const seasonIds = new Set();
      await Promise.all(
        matchIds.map(async matchId => {
          const [maps, matchData] = await Promise.all([
            this.GetMapStats(matchId),
            this.GetMatchData(matchId)
          ]);
          if (Array.isArray(maps)) {
            maps.forEach(m => {
              this.$set(this.mapIdLookup, m.id, m.map_name);
            });
          }
          if (matchData && matchData.season_id) {
            seasonIds.add(matchData.season_id);
          }
        })
      );

      await Promise.all(
        [...seasonIds].map(async seasonId => {
          try {
            const cvars = await this.GetSeasonCVARs(seasonId);
            if (cvars && typeof cvars === "object" && cvars.map_pool_names) {
              // Reassign (not mutate) so Vue 2 picks up the new keys.
              this.seasonMapNames = {
                ...this.seasonMapNames,
                ...JSON.parse(cvars.map_pool_names)
              };
            }
          } catch (error) {
            // Ignore - this season just won't have custom names resolved.
          }
        })
      );
    } catch (error) {
      console.log(error);
    } finally {
      this.isLoading = false;
    }
  },
  computed: {
    steamId() {
      return this.$route.params.steam_id;
    },
    playerName() {
      if (this.rawStats.length > 0) return this.rawStats[0].name;
      return this.$route.params.steam_id;
    },
    mapStats() {
      const grouped = {};
      this.rawStats.forEach(s => {
        const mapId = this.mapIdLookup[s.map_id] || `map_${s.map_id}`;
        if (!grouped[mapId]) {
          grouped[mapId] = {
            map_id: mapId,
            maps: 0,
            kills: 0,
            deaths: 0,
            assists: 0,
            rounds: 0,
            damage: 0,
            hs_kills: 0,
            k1: 0,
            k2: 0,
            k3: 0,
            k4: 0,
            k5: 0,
            ratings: []
          };
        }
        const g = grouped[mapId];
        g.maps++;
        g.kills += s.kills || 0;
        g.deaths += s.deaths || 0;
        g.assists += s.assists || 0;
        g.rounds += s.roundsplayed || 0;
        g.damage += s.damage || 0;
        g.hs_kills += s.headshot_kills || 0;
        g.k1 += s.k1 || 0;
        g.k2 += s.k2 || 0;
        g.k3 += s.k3 || 0;
        g.k4 += s.k4 || 0;
        g.k5 += s.k5 || 0;
        if (s.roundsplayed > 0) {
          g.ratings.push(
            parseFloat(
              this.GetRating(
                s.kills,
                s.roundsplayed,
                s.deaths,
                s.k1,
                s.k2,
                s.k3,
                s.k4,
                s.k5
              )
            )
          );
        }
      });

      return Object.values(grouped).map(g => ({
        map_name: g.map_id,
        map_display_name: getMapDisplayName(g.map_id, this.seasonMapNames),
        maps: g.maps,
        kills: g.kills,
        deaths: g.deaths,
        assists: g.assists,
        rounds: g.rounds,
        kd: g.deaths > 0 ? (g.kills / g.deaths).toFixed(2) : g.kills.toFixed(2),
        hsp: g.kills > 0 ? Math.round((g.hs_kills / g.kills) * 100) : 0,
        adr: g.rounds > 0 ? (g.damage / g.rounds).toFixed(2) : "0.00",
        rating:
          g.ratings.length > 0
            ? g.ratings.reduce((a, b) => a + b, 0) / g.ratings.length
            : 0
      }));
    },
    headers() {
      return [
        { text: this.$t("GlobalStats.Map"), value: "map_name", sortable: true },
        { text: this.$t("GlobalStats.Maps"), value: "maps", sortable: true },
        {
          text: this.$t("GlobalStats.Rounds"),
          value: "rounds",
          sortable: true
        },
        { text: this.$t("PlayerStats.Kills"), value: "kills", sortable: true },
        {
          text: this.$t("PlayerStats.Deaths"),
          value: "deaths",
          sortable: true
        },
        {
          text: this.$t("PlayerStats.Assists"),
          value: "assists",
          sortable: true
        },
        { text: this.$t("PlayerStats.KDR"), value: "kd", sortable: false },
        {
          text: this.$t("PlayerStats.Headshot") + "%",
          value: "hsp",
          sortable: true
        },
        { text: this.$t("PlayerStats.ADR"), value: "adr", sortable: false },
        {
          text: this.$t("PlayerStats.Rating"),
          value: "rating",
          sortable: true
        }
      ];
    }
  }
};
</script>
