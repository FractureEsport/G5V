<template>
  <v-container class="vetoInfo" fluid v-if="vetoInfo.length > 1">
    <v-data-table
      :headers="headers"
      :items="vetoInfo"
      class="elevation-1"
      :sort-by="['id']"
      hide-default-footer
      :no-data-text="$t('Veto.NoData')"
      :expanded.sync="expanded"
      show-expand
    >
      <template v-slot:item.map="{ item }">
        <b v-if="item.pick_or_veto === 'pick'">
          {{ mapDisplayName(item.map) }}
        </b>
        <div v-else>
          {{ mapDisplayName(item.map) }}
        </div>
      </template>
      <template v-slot:item.pick_or_veto="{ item }">
        <b v-if="item.pick_or_veto === 'pick'">
          {{ $t("Veto.VetoPick") }}
        </b>
        <div
          v-else-if="
            item.pick_or_veto === 'ban' || item.pick_or_veto === 'veto'
          "
        >
          {{ $t("Veto.VetoBan") }}
        </div>
      </template>
      <template v-slot:item.team_name="{ item }">
        <b v-if="item.pick_or_veto === 'pick'">
          <div v-if="item.team_name === 'Decider'">
            {{ $t("Veto.DeciderTeam") }}
          </div>
          <div v-else>
            {{ item.team_name }}
          </div>
        </b>
        <div v-else>
          {{ item.team_name }}
        </div>
      </template>

      <template
        v-slot:[`item.data-table-expand`]="{ item, isExpanded, expand }"
      >
        <v-icon
          v-if="item.side"
          :class="[
            'v-data-table__expand-icon',
            { 'v-data-table__expand-icon--active': isExpanded }
          ]"
          @click.stop="expand(!isExpanded)"
          >$expand</v-icon
        >
      </template>

      <template v-slot:expanded-item="{ item, headers }">
        <td :colspan="headers.length">
          <v-data-table
            item-key="id"
            class="elevation-1"
            :headers="additionalHeaders"
            hide-default-footer
            dense
            :key="item.id"
            :items="[item]"
            disable-sort
            :colspan="headers.length"
          />
        </td>
      </template>
    </v-data-table>
  </v-container>
</template>

<script>
import { getMapDisplayName } from "../utils/mapNames";
export default {
  props: {
    match_id: Number
  },
  data() {
    return {
      vetoInfo: [
        {
          id: -1,
          match_id: -1,
          team_name: "",
          team_name_side: null,
          map: "",
          pick_or_veto: "",
          side: ""
        }
      ],
      expanded: []
    };
  },
  mounted() {
    this.useStreamOrStaticData();
  },
  methods: {
    mapDisplayName(mapId) {
      return getMapDisplayName(mapId);
    },
    async useStreamOrStaticData() {
      // Template will contain v-rows/etc like on main Team page.
      await this.GetMatchData(this.match_id);
      this.getVetoInfo();
    },
    async getVetoInfo() {
      try {
        let vetoRes = await this.GetVetoesOfMatch(this.match_id);
        if (typeof vetoRes != "string") this.vetoInfo = vetoRes;
      } catch (error) {
        console.log(error);
      }
    },
    expandAll: function() {
      this.expanded = this.people.filter(item => item.description);
    },
    collapseAll: function() {
      this.expanded = [];
    }
  },
  computed: {
    headers() {
      return [
        {
          text: this.$t("Veto.TeamHeader"),
          sortable: false,
          align: "start",
          value: "team_name"
        },
        {
          text: this.$t("Veto.MapHeader"),
          sortable: false,
          value: "map"
        },
        {
          text: this.$t("Veto.PickBan"),
          sortable: false,
          value: "pick_or_veto"
        },
        {
          text: "",
          value: "data-table-expand"
        }
      ];
    },
    additionalHeaders() {
      return [
        {
          text: this.$t("Veto.TeamHeader"),
          value: "team_name_side"
        },
        {
          text: this.$t("Veto.MapHeader"),
          sortable: false,
          value: "map"
        },
        {
          text: this.$t("Veto.SidePick"),
          sortable: false,
          value: "side"
        }
      ];
    }
  }
};
</script>
