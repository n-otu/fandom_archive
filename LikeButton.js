export default {
    props: ['initial_likes'],
    data() {
      return {
        liked: false,
        count: this.initial_likes || 0
      };
    },
    template: `
      <button @click="toggleLike">
        {{ liked ? '❤️' : '🤍' }} {{ count }}
      </button>
    `,
    methods: {
      toggleLike() {
        this.liked = !this.liked;
        this.count += this.liked ? 1 : -1;
      }
    }
  };
