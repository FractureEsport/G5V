<template>
  <v-container fluid>
    <v-card class="mb-4">
      <v-card-title>
        <v-icon x-large class="mr-3">mdi-chart-box-outline</v-icon>
        <span class="text-h5">{{ $t("GlobalStats.AdditionalStats") }}</span>
      </v-card-title>
      <v-card-text class="pb-0">
        <v-btn outlined small color="primary" to="/stats">
          <v-icon left small>mdi-chart-line</v-icon>
          {{ $t("GlobalStats.GlobalStats") }}
        </v-btn>
      </v-card-text>
    </v-card>

    <v-card>
      <v-toolbar flat color="grey lighten-4" dense class="px-2">
        <v-tabs v-model="tab" color="primary" class="flex-grow-0">
          <v-tab>
            <v-icon left small>mdi-map</v-icon>
            {{ $t("GlobalStats.MapStats") }}
          </v-tab>
          <v-tab>
            <v-icon left small>mdi-pistol</v-icon>
            {{ $t("GlobalStats.WeaponStats") }}
          </v-tab>
        </v-tabs>
        <v-spacer />
        <v-select
          v-if="seasonOptions.length > 0"
          v-model="selectedSeasonId"
          :items="seasonSelectItems"
          item-text="text"
          item-value="value"
          dense
          hide-details
          outlined
          background-color="white"
          style="max-width: 260px"
          class="my-2"
        />
      </v-toolbar>
      <v-divider />

      <v-alert
        v-if="!isLoading && rawStats.length === 0"
        type="info"
        class="ma-4"
      >
        {{ $t("PlayerStats.NoPlayerStatFound") }}
      </v-alert>

      <v-tabs-items v-model="tab">
        <v-tab-item>
          <v-data-table
            :headers="mapHeaders"
            :items="mapExtraStats"
            :loading="isLoading"
            :loading-text="$t('misc.LoadText')"
            sort-by="kills"
            :sort-desc="true"
            :items-per-page="15"
            class="elevation-0"
          >
            <template v-slot:item.map_name="{ item }">{{
              item.map_display_name
            }}</template>
            <template v-slot:item.hsp="{ item }">{{ item.hsp }}%</template>
          </v-data-table>
        </v-tab-item>
        <v-tab-item>
          <v-data-table
            :headers="weaponHeaders"
            :items="weaponStats"
            :loading="isLoading"
            :loading-text="$t('misc.LoadText')"
            sort-by="kills"
            :sort-desc="true"
            :items-per-page="20"
            class="elevation-0"
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
        </v-tab-item>
      </v-tabs-items>
    </v-card>
  </v-container>
</template>

<script>
import { getMapDisplayName } from "../utils/mapNames";
export default {
  name: "GlobalExtraStats",
  data() {
    return {
      tab: 0,
      rawStats: [],
      // map_stats.id -> technical map id, resolved once from every map ever
      // played so per-row map_id values in player_stat_extras can be named.
      mapIdLookup: {},
      // Custom display names (typically for Workshop maps) for the currently
      // selected season - only meaningful once a single season is picked.
      seasonMapNames: {},
      seasonOptions: [],
      selectedSeasonId: null,
      isLoading: true
    };
  },
  async created() {
    try {
      const [seasons, mapstats] = await Promise.all([
        this.GetAllSeasons(),
        this.GetAllMapStats()
      ]);
      if (Array.isArray(seasons)) {
        this.seasonOptions = seasons
          .map(s => ({ id: s.id, name: s.name }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
      if (Array.isArray(mapstats)) {
        mapstats.forEach(m => {
          this.$set(this.mapIdLookup, m.id, m.map_name);
        });
      }
      const seasonQuery = parseInt(this.$route.query.season, 10);
      if (!isNaN(seasonQuery)) {
        this.selectedSeasonId = seasonQuery;
        return;
      }
    } catch (error) {
      console.log(error);
    }
    await this.loadStats();
  },
  watch: {
    async selectedSeasonId() {
      await this.loadStats();
    }
  },
  computed: {
    seasonSelectItems() {
      return [
        { value: null, text: this.$t("PlayerStats.AllSeasons") },
        ...this.seasonOptions.map(s => ({ value: s.id, text: s.name }))
      ];
    },
    mapExtraStats() {
      const grouped = {};
      this.rawStats.forEach(e => {
        if (e.suicide || e.friendly_fire) return;
        const mapId = this.mapIdLookup[e.map_id] || `map_${e.map_id}`;
        if (!grouped[mapId]) {
          grouped[mapId] = {
            map_id: mapId,
            kills: 0,
            hs: 0,
            blind: 0,
            smoke: 0,
            noscope: 0,
            wallbang: 0
          };
        }
        const g = grouped[mapId];
        g.kills++;
        if (e.headshot) g.hs++;
        if (e.attacker_blind) g.blind++;
        if (e.thru_smoke) g.smoke++;
        if (e.no_scope) g.noscope++;
        if (e.penetrated) g.wallbang++;
      });
      return Object.values(grouped).map(g => ({
        map_name: g.map_id,
        map_display_name: getMapDisplayName(g.map_id, this.seasonMapNames),
        kills: g.kills,
        hs: g.hs,
        hsp: g.kills > 0 ? Math.round((g.hs / g.kills) * 100) : 0,
        blind: g.blind,
        smoke: g.smoke,
        noscope: g.noscope,
        wallbang: g.wallbang
      }));
    },
    weaponStats() {
      const myKills = this.rawStats.filter(e => !e.suicide && !e.friendly_fire);
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
    mapHeaders() {
      return [
        { text: this.$t("GlobalStats.Map"), value: "map_name", sortable: true },
        { text: this.$t("PlayerStats.Kills"), value: "kills", sortable: true },
        {
          text: this.$t("PlayerStats.Headshot") + "%",
          value: "hsp",
          sortable: true
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
    },
    weaponHeaders() {
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
    async loadStats() {
      this.isLoading = true;
      this.seasonMapNames = {};
      try {
        let res;
        if (this.selectedSeasonId == null) {
          res = await this.GetAllExtraStats();
        } else {
          res = await this.GetSeasonExtraStatsAll(this.selectedSeasonId);
          try {
            const cvars = await this.GetSeasonCVARs(this.selectedSeasonId);
            if (cvars && typeof cvars === "object" && cvars.map_pool_names) {
              this.seasonMapNames = JSON.parse(cvars.map_pool_names);
            }
          } catch (error) {
            // Ignore - this season just won't have custom names resolved.
          }
        }
        this.rawStats = Array.isArray(res) ? res : [];
      } catch (error) {
        console.log(error);
        this.rawStats = [];
      } finally {
        this.isLoading = false;
      }
    },
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
