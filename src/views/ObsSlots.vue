<template>
  <v-container fluid>
    <v-card class="mx-auto">
      <v-card-title class="headline">
        <v-icon left>mdi-broadcast</v-icon>
        {{ $t("Cast.ObsSlotsTitle") }}
      </v-card-title>
      <v-card-subtitle>{{ $t("Cast.ObsSlotsHint") }}</v-card-subtitle>

      <v-progress-linear v-if="loadingUser" indeterminate color="primary" />

      <v-alert v-if="!loadingUser && !canAccess" type="error" class="ma-4">
        {{ $t("Cast.AccessDenied") }}
      </v-alert>

      <template v-if="!loadingUser && canAccess">
        <v-card-text>
          <v-row align="center">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="newSlotLabel"
                :label="$t('Cast.SlotLabel')"
                prepend-icon="mdi-plus-box"
                clearable
                @keyup.enter="createSlot"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="auto">
              <v-btn color="primary" :loading="creating" @click="createSlot">
                <v-icon left>mdi-plus</v-icon>
                {{ $t("Cast.NewSlot") }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>

        <v-alert v-if="successMsg" type="success" dense class="mx-4">{{
          successMsg
        }}</v-alert>
        <v-alert v-if="errorMsg" type="error" dense class="mx-4">{{
          errorMsg
        }}</v-alert>

        <v-divider class="my-2" />

        <v-progress-linear v-if="loadingSlots" indeterminate color="primary" />

        <v-alert
          v-if="!loadingSlots && slots.length === 0"
          type="info"
          class="mx-4"
        >
          {{ $t("misc.NoData") }}
        </v-alert>

        <v-list v-if="slots.length" two-line>
          <v-list-item v-for="slot in slots" :key="slot.id">
            <v-list-item-content>
              <v-row align="center">
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model="slot.label"
                    :label="$t('Cast.SlotLabel')"
                    hide-details
                    dense
                    @change="renameSlot(slot)"
                  />
                  <div class="caption grey--text mt-1">{{ slot.slug }}</div>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-autocomplete
                    :value="slot.match_id"
                    :items="matchOptions"
                    item-text="text"
                    item-value="id"
                    :label="$t('Cast.AssignMatch')"
                    :placeholder="$t('Cast.NoMatch')"
                    clearable
                    hide-details
                    dense
                    @change="value => assignMatch(slot, value)"
                  />
                </v-col>
                <v-col cols="12" sm="2" class="text-right">
                  <v-btn icon color="error" @click="confirmDeleteSlot(slot)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </v-col>
              </v-row>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </template>
    </v-card>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card v-if="slotToDelete">
        <v-card-title>{{ $t("Seasons.DeleteConfirmation") }}</v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="deleteDialog = false">{{ $t("misc.No") }}</v-btn>
          <v-btn color="error" :loading="deleting" @click="deleteSlot">{{
            $t("misc.Yes")
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
export default {
  name: "ObsSlots",
  data() {
    return {
      user: { id: null, admin: 0, super_admin: 0, cast: 0 },
      loadingUser: true,
      slots: [],
      loadingSlots: false,
      allMatches: [],
      newSlotLabel: "",
      creating: false,
      successMsg: "",
      errorMsg: "",
      deleteDialog: false,
      slotToDelete: null,
      deleting: false
    };
  },
  computed: {
    canAccess() {
      return (
        Number(this.user.cast) === 1 ||
        Number(this.user.admin) === 1 ||
        Number(this.user.super_admin) === 1
      );
    },
    matchOptions() {
      const active = [];
      const rest = [];
      this.allMatches.forEach(m => {
        const item = {
          id: m.id,
          text: `#${m.id} - ${m.team1_string} vs ${m.team2_string}`
        };
        if (!m.cancelled && !m.end_time) active.push(item);
        else rest.push(item);
      });
      return [...active, ...rest];
    }
  },
  async mounted() {
    this.user = await this.IsLoggedIn();
    this.loadingUser = false;
    if (this.canAccess) {
      await Promise.all([this.loadMatches(), this.loadSlots()]);
    }
  },
  methods: {
    async loadSlots() {
      this.loadingSlots = true;
      try {
        this.slots = await this.GetObsSlots();
      } catch (error) {
        this.slots = [];
      } finally {
        this.loadingSlots = false;
      }
    },
    async loadMatches() {
      try {
const matches = await this.GetAllMatches();
        this.allMatches = Array.isArray(matches) ? matches : [];
      } catch (error) {
        this.allMatches = [];
      }
    },
    async createSlot() {
      this.successMsg = "";
      this.errorMsg = "";
      this.creating = true;
      try {
        const slot = await this.CreateObsSlot(this.newSlotLabel || null);
        this.slots.push(slot);
        this.newSlotLabel = "";
      } catch (err) {
        this.errorMsg = err.response?.data?.message || err.toString();
      } finally {
        this.creating = false;
      }
    },
    async renameSlot(slot) {
      try {
        await this.UpdateObsSlot(slot.id, { label: slot.label || null });
      } catch (err) {
        this.errorMsg = err.response?.data?.message || err.toString();
      }
    },
    async assignMatch(slot, matchId) {
      this.errorMsg = "";
      try {
        const updated = await this.UpdateObsSlot(slot.id, {
          match_id: matchId ?? null
        });
        Object.assign(slot, updated);
      } catch (err) {
        this.errorMsg = err.response?.data?.message || err.toString();
      }
    },
    confirmDeleteSlot(slot) {
      this.slotToDelete = slot;
      this.deleteDialog = true;
    },
    async deleteSlot() {
      this.deleting = true;
      try {
        await this.DeleteObsSlot(this.slotToDelete.id);
        this.slots = this.slots.filter(s => s.id !== this.slotToDelete.id);
        this.deleteDialog = false;
      } catch (err) {
        this.errorMsg = err.response?.data?.message || err.toString();
      } finally {
        this.deleting = false;
      }
    }
  }
};
</script>
