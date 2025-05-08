import { createApp } from "vue";
import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";
import { fileToGraffitiObject, graffitiFileSchema } from "@graffiti-garden/wrapper-files";
import { GraffitiObjectToFile } from "@graffiti-garden/wrapper-files/vue";
import Popup from './Popup.js';
import LikeButton from './LikeButton.js';


const app = createApp({
  data() {
    return {
      welcomeMessage: '',
      showWelcome: false,
      selectedForum: null,
      forumObjects: [],
      newForumDescription: '',
      forumIconUrl: '',
      showNewForumModal: false,
      showSidebar: true,
      currentChannelIconUrl: '',
      currentChannelName: '',
      showNewChannelModal: false,
      showInvitesModal: false,
      showNewChannelForm: false,
      showInvitations: false,
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

    getPrivateChannelName(channelId) {
      const meta = this.privateChannelMetaObjects?.find(
        obj => obj.value?.object?.channel === channelId
      );
      return meta?.value?.object?.name || channelId;
    }
,

    goBackToForums() {
      this.selectedChannel = null;

      const url = new URL(window.location);
      url.searchParams.delete('channel');
      window.history.pushState({}, '', url);
    },



    async discoverLikes() {
      const actor = this.$graffitiSession?.value?.actor;
      if (!actor) return;

      const likes = await this.$graffiti.discover({
        channels: [`starred-forums:${actor}`],
        schema: {
          properties: {
            value: {
              type: 'object',
              required: ['activity', 'object'],
              properties: {
                activity: { const: 'Like' },
                object: { type: 'string' }
              }
            }
          }
        }
      });

      console.log("Found likes from discoverLikes():", likes);
      this.starredChannels = Array.isArray(likes) ? likes : [];
    },

    getForumNameFromChannel(channelId) {
      if (!Array.isArray(this.forumObjects)) return channelId;
      const forum = this.forumObjects.find(f => f.value.object.channel === channelId);
      return forum ? forum.value.object.name : channelId;
    }
    ,

    open_channel(channelId) {
      console.log("Opening channel:", channelId);
      this.selectedChannel = channelId;
      this.currentTab = 'channels';

      const url = new URL(window.location);
      url.searchParams.set("channel", channelId);
      window.history.pushState({}, '', url);
    },


    goBackToChannels() {
      this.selectedChannel = null;

      // clear query param from url w/o reloading
      const url = new URL(window.location);
      url.searchParams.delete('channel');
      window.history.pushState({}, '', url);

      // scroll to top of channels
      const channelsSection = document.getElementById('channels');
      if (channelsSection) channelsSection.scrollIntoView({ behavior: 'smooth' });
    },

    getLatestProfile(objects) {
      if (!objects || objects.length === 0) return null;
      return objects
        .slice()
        .sort((a, b) => (b.value.published || 0) - (a.value.published || 0))[0]
        .value || null;
    },

    forum_likes(url) {
      // count likes for a forum by URL
      const likes = this.starredChannels.filter(obj => obj.value.object === url);
      return likes.length;
    },

    async like_forum(channelId) {
      const session = this.$graffitiSession?.value;
      if (!session || !channelId) return;

      const alreadyLiked = this.starredChannels.some(obj => obj.value.object === channelId);
      if (alreadyLiked) return;

      console.log("Liking forum:", channelId);

      // Create Like object
      await this.$graffiti.put({
        value: {
          activity: "Like",
          object: channelId
        },
        channels: [`starred-forums:${session.actor}`]
      }, session);

      // Refetch likes
      const updatedLikes = await this.$graffiti.discover({
        channels: [`starred-forums:${session.actor}`],
        schema: {
          properties: {
            value: {
              type: 'object',
              required: ['activity', 'object'],
              properties: {
                activity: { const: 'Like' },
                object: { type: 'string' }
              }
            }
          }
        }
      });

      console.log("Likes loaded after like:", updatedLikes);

      this.starredChannels = Array.isArray(updatedLikes) ? updatedLikes : [];
    }
,


    forum_like_count(channelId) {
      return this.starredChannels.filter(obj => obj.value.object === channelId).length;
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
      const file = event.target.files[0];
      if (!session || !file) return;

      try {
        const graffitiObj = await fileToGraffitiObject(file);
        const { url } = await this.$graffiti.put(graffitiObj, session);

        // use a flag to determine profile or channel
        if (this.showProfileForm) {
          this.profileIconUrl = url;
        } else if (this.showNewChannelModal) {
          this.channelIconUrl = url;
        }
        else if (this.showNewForumModal) {
          this.forumIconUrl = url;
        }

        console.log("Uploaded file URL:", url);
      } catch (err) {
        console.error("File upload failed:", err);
      }
    },




    update_profile(objects) {

      if (!objects.length) {
        // new user w/ no profile, create profile w/ all blank fields
        this.latestProfile = null;
        this.profileName = '';
        this.profilePronouns = '';
        this.profileBio = '';
        this.profileIconUrl = '';
        this.showProfileForm = true;
        // return;
      }

      const latest = objects
        .slice()
        .sort((a, b) => (b.value.published || 0) - (a.value.published || 0))[0]?.value;

      if (latest) {
        this.latestProfile = latest;
        this.profileName = latest.name || '';
        this.profilePronouns = latest.pronouns || '';
        this.profileBio = latest.bio || '';
        this.profileIconUrl = latest.icon || '';
        this.showProfileForm = false;
      }
    },


    join_forum(channel) {

      this.selectedChannel = channel;
      this.currentTab = 'forums';

      const url = new URL(window.location);
      url.searchParams.set("channel", channel);
      window.history.pushState({}, '', url);
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
            channel: channelId,
            description: this.newForumDescription,
            icon: this.forumIconUrl

          }
        },
        channels: ['global-forums'],
        allowed: undefined
      }, session);

      this.newForumName = '';
      this.newForumTopic = '';
      this.newForumDescription = '';
      this.forumIconUrl = '';
      this.showNewForumModal = false;
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
          this.joinedChannels = [...new Set([...this.joinedChannels, channel])];
        }
        this.selectedChannel = channel;

        if (!this.channels.includes(channel)) {
          this.channels.push(channel);
        }

        if (!this.channels.includes('designftw')) {
          this.channels.push('designftw');
        }

        // send a join message
        this.$graffiti.put({
          value: {
            content: `${this.$graffitiSession?.value?.actor} joined the chat.`,
            published: Date.now(),
            system: true
          },
          channels: [channel]
        }, this.$graffitiSession.value);

        if (this.currentTab === 'channels') {
          const name = this.getPrivateChannelName(channel);
          this.welcomeMessage = `🎉 Welcome to our channel!`;
          this.showWelcome = true;
          setTimeout(() => {
            this.showWelcome = false;
          }, 3000);
        }

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
              channel: channelId,
              icon: this.channelIconUrl
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

      // animation
      await this.$nextTick(() => {
        const newEl = this.$refs.newMessage;
        if (newEl && newEl.classList) {
          newEl.classList.add('message-slide-in');
          setTimeout(() => {
            newEl.classList.remove('message-slide-in');
          }, 300);
        }
      });
    },

  },

  mounted: async function () {

    const urlParams = new URLSearchParams(window.location.search);
    const channelFromUrl = urlParams.get('channel');
    if (channelFromUrl) {
      this.selectedChannel = channelFromUrl;
      if (!this.joinedChannels.includes(channelFromUrl)) {
        this.joinedChannels.push(channelFromUrl);
      }

      // decide tab by checking if it's a forum or private channel
      if (channelFromUrl.startsWith("forum:")) {
        this.currentTab = 'forums';
      } else {
        this.currentTab = 'channels';
      }
    }


    // watch for login changes and load data
    this.$watch(
      () => this.$graffitiSession?.value?.actor,
      async (actor) => {
        if (!actor) return;

        try {
          // load accepted invites
          let invites = [];
          try {
            const res = await this.$graffiti.discover({
              channels: ['channel-invites'],
              schema: {
                properties: {
                  value: {
                    required: ['activity', 'object', 'target'],
                    properties: {
                      activity: { const: 'Add' },
                      object: { type: 'string' },
                      target: { type: 'string' }
                    }
                  }
                }
              }
            });
            if (Array.isArray(res)) invites = res;
          } catch (err) {
            console.warn("Error loading invites:", err);
          }

          const accepted = invites.filter(i => i.value.object === actor);
          const acceptedChannels = accepted.map(i => i.value.target);
          const allJoined = new Set([...this.joinedChannels, ...acceptedChannels]);
          this.joinedChannels = Array.from(allJoined);

          // load profile
          let profileObjects = [];
          try {
            const meta = await this.$graffiti.discover({
              channels: ['private-channel-directory'],
              schema: {
                properties: {
                  value: {
                    required: ['activity', 'object'],
                    properties: {
                      activity: { const: 'Create' },
                      object: {
                        required: ['type', 'name', 'channel'],
                        properties: {
                          type: { const: 'PrivateChannel' },
                          name: { type: 'string' },
                          topic: { type: 'string' },
                          channel: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            });
            this.privateChannelMetaObjects = meta;

            const res = await this.$graffiti.discover({
              channels: [actor],
              schema: {
                properties: {
                  value: {
                    properties: {
                      describes: { type: 'string' },
                      name: { type: 'string' },
                      pronouns: { type: 'string' },
                      bio: { type: 'string' },
                      icon: { type: 'string' },
                      published: { type: 'number' }
                    }
                  }
                }
              }
            });
            if (Array.isArray(res)) profileObjects = res;
          } catch (err) {
            console.warn("Error loading profile:", err);
          }
          this.update_profile(profileObjects);

          // load liked forums
          let likes = [];
          try {
            const res = await this.$graffiti.discover({
              channels: [`starred-forums:${actor}`],
              schema: {
                properties: {
                  value: {
                    type: 'object',
                    required: ['activity', 'object'],
                    properties: {
                      activity: { const: 'Like' },
                      object: { type: 'string' }
                    }
                  }
                }
              }
            });
            if (Array.isArray(res)) likes = res;
            else console.warn("Expected likes array, got:", res);
          } catch (err) {
            console.warn("Error loading likes:", err);
          }
          this.starredChannels = likes;

          // get forum metadata
          let forums = [];
          try {
            const res = await this.$graffiti.discover({
              channels: ['global-forums'],
              schema: {
                properties: {
                  value: {
                    required: ['activity', 'object'],
                    properties: {
                      activity: { const: 'Create' },
                      object: {
                        required: ['type', 'name', 'topic', 'channel'],
                        properties: {
                          type: { const: 'Forum' },
                          name: { type: 'string' },
                          topic: { type: 'string' },
                          channel: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            });
            if (Array.isArray(res)) forums = res;
          } catch (err) {
            console.warn("Error loading forums:", err);
          }
          this.forumObjects = forums;
          console.log("Loaded forums:", this.forumObjects);
          console.log("Loaded likes:", this.starredChannels);


        } catch (err) {
          console.error("Error during mounted() login setup:", err);
        }
      },
      { immediate: true }


    );

    // loading screen
    window.addEventListener("load", () => {
      const screen = document.getElementById("loading-screen");
      if (screen) {
        screen.style.opacity = 0;
        setTimeout(() => {
          screen.style.display = "none";
        }, 400); // matches transition time
      }
    });


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

// fix focusing issue
app.directive('focus', {
  mounted(el) {
    el.focus();
  }
});

app.component('like-button', LikeButton);
app.component('Popup', Popup)
app.use(GraffitiPlugin, {
    // graffiti: new GraffitiLocal(),
    graffiti: new GraffitiRemote(),
  })
app.mount("#app");
