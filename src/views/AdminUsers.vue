<template>
  <v-container fluid>
    <v-card class="mx-auto">
      <v-card-title class="headline">
        <v-icon left>mdi-account-group</v-icon>
        {{ $t("AdminUsers.Title") }}
      </v-card-title>

      <v-progress-linear v-if="loadingUser" indeterminate color="primary" />

      <v-alert v-if="!loadingUser && !isSuperAdmin" type="error">
        {{ $t("AdminUsers.AccessDenied") }}
      </v-alert>

      <template v-if="!loadingUser && isSuperAdmin">
        <v-card-text>
          <v-text-field
            v-model="search"
            :label="$t('AdminUsers.SearchLabel')"
            prepend-icon="mdi-magnify"
            clearable
            @keyup.enter="searchUsers"
            @click:clear="clearSearch"
          />
        </v-card-text>

        <v-data-table
          :headers="headers"
          :items="users"
          :loading="loading"
          :loading-text="$t('misc.LoadText')"
          :no-data-text="$t('misc.NoData')"
          :items-per-page="25"
          class="elevation-1"
        >
          <template v-slot:item.super_admin="{ item }">
            <v-chip
              small
              :color="item.super_admin === 1 ? 'primary' : 'grey lighten-1'"
            >
              {{ item.super_admin === 1 ? $t("misc.Yes") : $t("misc.No") }}
            </v-chip>
          </template>
          <template v-slot:item.admin="{ item }">
            <v-chip
              small
              :color="item.admin === 1 ? 'orange' : 'grey lighten-1'"
            >
              {{ item.admin === 1 ? $t("misc.Yes") : $t("misc.No") }}
            </v-chip>
          </template>
          <template v-slot:item.cast="{ item }">
            <v-chip small :color="item.cast === 1 ? 'teal' : 'grey lighten-1'">
              {{ item.cast === 1 ? $t("misc.Yes") : $t("misc.No") }}
            </v-chip>
          </template>
          <template v-slot:item.actions="{ item }">
            <v-btn
              icon
              small
              @click="openEdit(item)"
              :title="$t('AdminUsers.EditRights')"
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </template>
        </v-data-table>

        <v-dialog v-model="editDialog" max-width="450">
          <v-card v-if="editUser">
            <v-card-title>
              <v-avatar size="36" class="mr-2">
                <img :src="editUser.small_image" v-if="editUser.small_image" />
                <v-icon v-else>mdi-account</v-icon>
              </v-avatar>
              {{ editUser.name }}
            </v-card-title>
            <v-card-subtitle>{{ editUser.steam_id }}</v-card-subtitle>
            <v-card-text>
              <v-switch
                v-model="editUser.admin"
                :true-value="1"
                :false-value="0"
                :label="$t('AdminUsers.Admin')"
                color="orange"
              />
              <v-switch
                v-model="editUser.super_admin"
                :true-value="1"
                :false-value="0"
                :label="$t('AdminUsers.SuperAdmin')"
                color="primary"
              />
              <v-switch
                v-model="editUser.cast"
                :true-value="1"
                :false-value="0"
                :label="$t('Cast.Title')"
                color="teal"
              />
            </v-card-text>
            <v-alert v-if="editError" type="error" class="ma-2">{{
              editError
            }}</v-alert>
            <v-card-actions>
              <v-spacer />
              <v-btn text @click="editDialog = false">{{
                $t("misc.Cancel")
              }}</v-btn>
              <v-btn color="primary" :loading="editSaving" @click="saveUser">
                <v-icon left>mdi-content-save</v-icon>
                {{ $t("misc.Save") }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <v-snackbar v-model="showSuccess" color="success" timeout="3000">
          {{ successMsg }}
        </v-snackbar>
      </template>
    </v-card>
  </v-container>
</template>

<script>
export default {
  name: "AdminUsers",
  data() {
    return {
      user: { id: null, super_admin: 0 },
      loadingUser: true,
      users: [],
      search: "",
      loading: false,
      editDialog: false,
      editUser: null,
      editSaving: false,
      editError: "",
      successMsg: "",
      showSuccess: false
    };
  },
  computed: {
    isSuperAdmin() {
      return Number(this.user.super_admin) === 1;
    },
    headers() {
      return [
        { text: this.$t("AdminUsers.Name"), value: "name" },
        { text: this.$t("AdminUsers.SteamId"), value: "steam_id" },
        {
          text: this.$t("AdminUsers.SuperAdmin"),
          value: "super_admin",
          align: "center"
        },
        { text: this.$t("AdminUsers.Admin"), value: "admin", align: "center" },
        { text: this.$t("Cast.Title"), value: "cast", align: "center" },
        {
          text: this.$t("AdminUsers.Actions"),
          value: "actions",
          sortable: false,
          align: "center"
        }
      ];
    }
  },
  async mounted() {
    this.user = await this.IsLoggedIn();
    this.loadingUser = false;
    if (this.isSuperAdmin) await this.loadUsers();
  },
  methods: {
    async loadUsers(query = "") {
      this.loading = true;
      try {
        const res = await this.GetAllUsers(query);
        this.users = Array.isArray(res) ? res : [];
      } catch (error) {
        this.users = [];
      } finally {
        this.loading = false;
      }
    },
    async searchUsers() {
      await this.loadUsers(this.search);
    },
    clearSearch() {
      this.search = "";
      this.loadUsers();
    },
    openEdit(item) {
      this.editUser = {
        ...item,
        admin: Number(item.admin),
        super_admin: Number(item.super_admin),
        cast: Number(item.cast)
      };
      this.editError = "";
      this.editDialog = true;
    },
    async saveUser() {
      this.editSaving = true;
      this.editError = "";
      try {
        const result = await this.UpdateUserInfo([
          {
            id: this.editUser.id,
            steam_id: this.editUser.steam_id,
            admin: this.editUser.admin,
            super_admin: this.editUser.super_admin,
            cast: this.editUser.cast
          }
        ]);
        if (result && result.message === "User successfully updated!") {
          const idx = this.users.findIndex(u => u.id === this.editUser.id);
          if (idx !== -1) {
            this.users[idx].admin = this.editUser.admin;
            this.users[idx].super_admin = this.editUser.super_admin;
            this.users[idx].cast = this.editUser.cast;
            this.users = [...this.users];
          }
          this.successMsg = this.$t("AdminUsers.UpdateSuccess", {
            name: this.editUser.name
          });
          this.showSuccess = true;
          this.editDialog = false;
        } else {
          this.editError =
            (result && result.message) || this.$t("AdminUsers.UpdateError");
        }
      } catch (error) {
        this.editError = this.$t("AdminUsers.UpdateError");
      } finally {
        this.editSaving = false;
      }
    }
  }
};
</script>
