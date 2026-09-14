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
          :to="'/stats/player/' + steamId + '/weapons'"
        >
          <v-icon left small>mdi-pistol</v-icon>
          {{ $t("GlobalStats.WeaponStats") }}
        </v-btn>
        <v-btn text small :to="'/stats/player/' + steamId + '/maps'">
          <v-icon left small>mdi-map</v-icon>
          {{ $t("GlobalStats.MapStats") }}
        </v-btn>
      </v-card-text>
    </v-card>

    <div v-if="isLoading">
      <v-skeleton-loader type="table" />
    </div>

    <v-alert v-else-if="extraStats.length === 0" type="info">
      {{ $t("PlayerStats.NoPlayerStatFound") }}
    </v-alert>

    <v-card v-else>
      <v-card-title class="primary white--text">
        <v-icon left dark>mdi-pistol</v-icon>
        {{ $t("GlobalStats.WeaponStats") }}
        <v-spacer />
        <v-select
          v-if="seasonOptions.length > 0"
          v-model="selectedSeasonId"
          :items="seasonSelectItems"
          item-text="text"
          item-value="value"
          dense
          hide-details
          filled
          dark
          style="max-width: 260px"
        />
      </v-card-title>
      <v-data-table
        :headers="headers"
        :items="weaponStats"
        sort-by="kills"
        :sort-desc="true"
        :items-per-page="20"
        class="elevation-1"
      >
        <template v-slot:item.weapon="{ item }">
          <strong>{{ formatWeapon(item.weapon) }}</strong>
        </template>
        <template v-slot:item.hsp="{ item }">
          <v-progress-linear
            :value="item.hsp"
            color="primary"
            height="16"
            rounded
          >
            <span class="white--text text-caption">{{ item.hsp }}%</span>
          </v-progress-linear>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script>
export default {
  name: "WeaponStats",
  data() {
    return {
      extraStats: [],
      // match_id -> season_id, so stats can be filtered down to one season.
      matchSeasonById: {},
      // { id, name } entries for every season any of this player's matches
      // belongs to, used to populate the season filter dropdown.
      seasonOptions: [],
      selectedSeasonId: null,
      isLoading: true,
      playerName: ""
    };
  },
  async created() {
    try {
      const res = await this.GetPlayerExtraStats(this.steamId);
      if (Array.isArray(res)) {
        this.extraStats = res;
        const mine = res.find(e => e.attacker_steam_id === this.steamId);
        if (mine) this.playerName = mine.attacker_name;
        else {
          const victim = res.find(e => e.player_steam_id === this.steamId);
          if (victim) this.playerName = victim.player_name;
        }

        const matchIds = [...new Set(res.map(e => e.match_id))];
        const seasonIds = new Set();
        await Promise.all(
          matchIds.map(async matchId => {
            const matchData = await this.GetMatchData(matchId);
            if (matchData && matchData.season_id) {
              this.$set(this.matchSeasonById, matchId, matchData.season_id);
              seasonIds.add(matchData.season_id);
            }
          })
        );

        await Promise.all(
          [...seasonIds].map(async seasonId => {
            try {
              const seasonInfo = await this.GetSeasonInfo(seasonId);
              if (seasonInfo && seasonInfo.name) {
                this.seasonOptions.push({
                  id: seasonId,
                  name: seasonInfo.name
                });
              }
            } catch (error) {
              // Ignore - this season just won't show up in the filter.
            }
          })
        );
        this.seasonOptions.sort((a, b) => a.name.localeCompare(b.name));
      }
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
    seasonSelectItems() {
      return [
        { value: null, text: this.$t("PlayerStats.AllSeasons") },
        ...this.seasonOptions.map(s => ({ value: s.id, text: s.name }))
      ];
    },
    filteredStats() {
      if (this.selectedSeasonId == null) return this.extraStats;
      return this.extraStats.filter(
        e => this.matchSeasonById[e.match_id] === this.selectedSeasonId
      );
    },
    weaponStats() {
      const myKills = this.filteredStats.filter(
        e =>
          e.attacker_steam_id === this.steamId && !e.suicide && !e.friendly_fire
      );
      const map = {};
      myKills.forEach(e => {
        const w = e.weapon || "unknown";
        if (!map[w]) {
          map[w] = {
            weapon: w,
            kills: 0,
            hs: 0,
            blind: 0,
            smoke: 0,
            noscope: 0,
            wallbang: 0
          };
        }
        map[w].kills++;
        if (e.headshot) map[w].hs++;
        if (e.attacker_blind) map[w].blind++;
        if (e.thru_smoke) map[w].smoke++;
        if (e.no_scope) map[w].noscope++;
        if (e.penetrated) map[w].wallbang++;
      });
      return Object.values(map).map(w => ({
        ...w,
        hsp: w.kills > 0 ? Math.round((w.hs / w.kills) * 100) : 0
      }));
    },
    headers() {
      return [
        {
          text: this.$t("GlobalStats.Weapon"),
          value: "weapon",
          sortable: true
        },
        { text: this.$t("PlayerStats.Kills"), value: "kills", sortable: true },
        {
          text: this.$t("PlayerStats.Headshot") + "%",
          value: "hsp",
          sortable: true,
          width: "180px"
        },
        { text: this.$t("GlobalStats.HSKills"), value: "hs", sortable: true },
        {
          text: this.$t("GlobalStats.BlindKills"),
          value: "blind",
          sortable: true
        },
        {
          text: this.$t("GlobalStats.SmokeKills"),
          value: "smoke",
          sortable: true
        },
        {
          text: this.$t("GlobalStats.NoScope"),
          value: "noscope",
          sortable: true
        },
        {
          text: this.$t("GlobalStats.Wallbang"),
          value: "wallbang",
          sortable: true
        }
      ];
    }
  },
  methods: {
    formatWeapon(name) {
      if (!name) return "Unknown";
      return name
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase())
        .replace("Hkp2000", "HKP2000")
        .replace("Usp Silencer", "USP-S")
        .replace("M4a1 Silencer", "M4A1-S")
        .replace("Ak47", "AK-47")
        .replace("Aug", "AUG")
        .replace("Sg556", "SG 553")
        .replace("Famas", "FAMAS")
        .replace("Galilar", "Galil AR")
        .replace("Awp", "AWP")
        .replace("Ssg08", "SSG 08")
        .replace("G3sg1", "G3SG1")
        .replace("Scar20", "SCAR-20")
        .replace("Mp5sd", "MP5-SD")
        .replace("Mp9", "MP9")
        .replace("Mac10", "MAC-10")
        .replace("Bizon", "PP-Bizon");
    }
  }
};
</script>
