import { createApp } from "vue";
import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";
import { fileToGraffitiObject, graffitiFileSchema } from "@graffiti-garden/wrapper-files";
import { GraffitiObjectToFile } from "@graffiti-garden/wrapper-files/vue";

import LikeButton from './LikeButton.js';


const app = createApp({
  data() {
    return {
      graffitiFileSchema,
      showProfileForm: false,
      profileObjects: [],
      latestProfile: null,
      profileName: '',
      profilePronouns: '',
      profileBio: '',
      profileIconUrl: '',
      selectedForumTopic: 'All',
      starredChannels: [],
      currentTab: 'home',
      newForumName: '',
      newForumTopic: '',
      newMemberId: '',
      joinedChannels: [],
      inviteObjects: [],
      newChannelName: '',
      newChannelTopic: '',
      invitedUserId: '',
      myMessage: "",
      sending: false,
      channels: [""],
      newGroupName: "",
      groupChats: [],
      selectedChannel: null,
      groupChatSchema: {
        properties: {
          value: {
            required: ['activity', 'object'],
            properties: {
              activity: { const: 'Create' },
              object: {
                required: ['type', 'name', 'channel'],
                properties: {
                  type: { const: 'Group Chat' },
                  name: { type: 'string' },
                  channel: { type: 'string' }
                }}}}}},
      editing: null,
      editBuffer: '',
      renameBuffer: '',

            };
      },


  methods: {
    forum_likes(url) {
      // count likes for a forum by URL
      const likes = this.starredChannels.filter(obj => obj.value.object === url);
      return likes.length;
    },

    async like_forum(url) {
      const session = this.$graffitiSession?.value;
      if (!session) return;

      const alreadyLiked = this.starredChannels.some(obj => obj.value.object === url);
      if (alreadyLiked) return;

      await this.$graffiti.put({
        value: {
          activity: "Like",
          object: url
        },
        channels: [`starred-forums:${session.actor}`]
      }, session);
    },

    async submitProfile() {
      const session = this.$graffitiSession?.value;
      const actor = session?.actor;

      if (!session || !actor) return;

      // save new profile object
      await this.$graffiti.put({
        value: {
          name: this.profileName,
          generator: "https://n-otu.github.io/fandom_archive/",
          pronouns: this.profilePronouns,
          bio: this.profileBio,
          icon: this.profileIconUrl,
          describes: actor,
          published: Date.now()
        },
        channels: [
          actor,
        "designftw-2025-studio1",
      ]
      }, session);

      // get latest profile info
      const objects = await this.$graffiti.discover({
        channels: [actor],
        schema: {
          properties: {
            value: {
              required: ['describes'],
              properties: {
                describes: { type: 'string' }
              }
            }
          }
        }
      });

      let latest = null;
      if (Array.isArray(objects)) {
        latest = objects.sort((a, b) => (b.value.published || 0) - (a.value.published || 0))[0];
      }

      if (latest) {
        this.latestProfile = latest.value;
      }

      this.showProfileForm = false;
    },



    async upload_file(event) {

      const session = this.$graffitiSession?.value;
      if (!session) return;

      const file = event.target.files[0];
      if (!file) return;

      try {
        const graffitiObj = await fileToGraffitiObject(file);
        const { url } = await this.$graffiti.put(graffitiObj, session);
        this.profileIconUrl = url;
        console.log("Uploaded file URL:", url);
      } catch (err) {
        console.error("File upload failed:", err);
      }
    },



update_profile(objects) {
  console.log("Profile objects received:", objects);
  const latest = objects[objects.length - 1]?.value;
  if (!latest) return;

  this.latestProfile = latest;
  this.profileName = latest.name || '';
  this.profilePronouns = latest.pronouns || '';
  this.profileBio = latest.bio || '';
  this.profileIconUrl = latest.icon || '';
}
,

    join_forum(channel) {
        this.selectedChannel = channel;
        if (!this.channels.includes(channel)) {
          this.channels.push(channel);
        }
      },

    //   all forums are public and universal
    async create_forum(session) {

      if (!session || !this.newForumName || !this.newForumTopic) return;

      const channelId = `forum:${crypto.randomUUID()}`;

      await this.$graffiti.put({
        value: {
          activity: 'Create',
          object: {
            type: 'Forum',
            name: this.newForumName,
            topic: this.newForumTopic,
            channel: channelId
          }
        },
        channels: ['global-forums'],
        allowed: undefined
      }, session);

      this.newForumName = '';
      this.newForumTopic = '';
    },



    async add_person_to_channel(session) {
        if (!this.newMemberId || !this.selectedChannel) return;

        await this.$graffiti.put({
            value: {
            activity: "Add",
            object: this.newMemberId,
            target: this.selectedChannel,
            },
            channels: ['channel-invites', this.selectedChannel],
            allowed: undefined,
        }, session);

        this.newMemberId = '';
    },


    async  delete_invite(invite) {
        await this.$graffiti.delete(invite, this.$graffitiSession.value);
      },

      join_chat(channel) {
        if (!this.joinedChannels.includes(channel)) {
          this.joinedChannels.push(channel);
        }
        this.selectedChannel = channel;

        if (!this.channels.includes(channel)) {
          this.channels.push(channel);
        }

        if (!this.channels.includes('designftw')) {
          this.channels.push('designftw');
        }

        // uutomatically send a joined message
        this.$graffiti.put({
          value: {
            content: `${this.$graffitiSession?.value?.actor} joined the chat.`,
            published: Date.now(),
            system: true
          },
          channels: [channel]
        }, this.$graffitiSession.value);
      },




    my_invites() {
        return this.inviteObjects.filter(
          (invite) =>
            invite.value.object === this.$graffitiSession?.value?.actor &&
            !this.have_joined(invite.value.target)
        );
      },

      my_joined_channels() {
        return this.inviteObjects.filter(
          (invite) =>
            invite.value.object === this.$graffitiSession?.value?.actor &&
            this.have_joined(invite.value.target)
        );
      },

      have_joined(channelId) {
        return this.selectedChannel === channelId || this.channels.includes(channelId);
      },


      async createPrivateChannel(session) {
        if (!this.newChannelName || !this.newChannelTopic) return;

        const channelId = `channel:${crypto.randomUUID()}`;

        // create the private channel object
        await this.$graffiti.put({
          value: {
            activity: "Create",
            object: {
              type: "PrivateChannel",
              name: this.newChannelName,
              topic: this.newChannelTopic,
              channel: channelId
            }
          },
          channels: ["private-channel-directory"],
          allowed: undefined
        }, session);

        // auto invite creator
        await this.$graffiti.put({
          value: {
            activity: "Add",
            object: session.actor,
            target: channelId
          },
          channels: ['channel-invites', channelId],
          allowed: undefined
        }, session);

        await this.$graffiti.put({
            value: {
              name: this.newChannelName,
              describes: channelId,
              published: Date.now(),
            },
            channels: ['designftw'],
            allowed: undefined
          }, session);

        // invite another user if specified
        if (this.invitedUserId && this.invitedUserId !== session.actor) {
          await this.$graffiti.put({
            value: {
              activity: "Add",
              object: this.invitedUserId,
              target: channelId
            },
            channels: ['channel-invites', channelId],
            allowed: undefined
          }, session);
        }

        // clear form
        this.newChannelName = '';
        this.newChannelTopic = '';
        this.invitedUserId = '';
      },



    current_group_name(nameObjects, channel) {
      const namesForChannel = nameObjects
        .filter(obj => obj.value.describes === channel)
        .sort((a, b) => (b.value.published || 0) - (a.value.published || 0));

      return namesForChannel.length ? namesForChannel[0].value.name : null;
    },


    async rename_group(session) {
      await this.$graffiti.put({
        value: {
          name: this.renameBuffer,
          describes: this.selectedChannel,
          published: Date.now(),
        },
        channels: ['designftw'],
        allowed: undefined
      }, session);

      this.renameBuffer = '';
    },


    startEditing(message) {
      this.editing = message.url;
      this.editBuffer = message.value.content;
    },

    cancelEdit() {
      this.editing = null;
      this.editBuffer = '';
    },

    async submitEdit(message) {
      await this.$graffiti.patch({
        value: [
          {
            op: "replace",
            path: "/content",
            value: this.editBuffer
          }
        ]
      }, message, this.$graffitiSession.value);
      console.log("Submitting profile with:", {
        name: this.profileName,
        describes: this.$graffitiSession?.value?.actor
      });


      this.cancelEdit();
    },

    async deleteMessage(message) {
      await this.$graffiti.delete(message, this.$graffitiSession.value);
    },


    async createGroupChat(session) {
      const channel = crypto.randomUUID();

      await this.$graffiti.put({
        value: {
          activity: 'Create',
          object: {
            type: 'Group Chat',
            name: this.newGroupName,
            channel: channel,
          }
        },
        channels: ['designftw'],
        allowed: undefined,
      }, session);

      this.newGroupName = '';
    },


    async sendMessage(session) {
      if (!session || !this.myMessage) return;

      this.sending = true;

      await this.$graffiti.put({
        value: {
          content: this.myMessage,
          published: Date.now(),
        },
        channels: [this.selectedChannel],
      }, session);

      this.sending = false;
      this.myMessage = "";

      // refocus input field after sending
      await this.$nextTick();
      this.$refs.messageInput.focus();
    },

  },

  components: {
    GraffitiObjectToFile
  },


  computed:  {
    userInviteChannel() {
      return `channel-invites:${this.$graffitiSession?.value?.actor || 'anon'}`;
    },
    userDirectoryChannel() {
      return `private-channel-directory:${this.$graffitiSession?.value?.actor || 'anon'}`;
    },
    userNameChannel() {
      return `channel-names:${this.$graffitiSession?.value?.actor || 'anon'}`;
    },
    starredChannelIds() {
      return this.starredChannels.map(obj => obj.value.object);
    }
  },
});

app.component('like-button', LikeButton);

app.use(GraffitiPlugin, {
    // graffiti: new GraffitiLocal(),
    graffiti: new GraffitiRemote(),
  })
app.mount("#app");
