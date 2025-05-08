export default {
    name: "popup",
    emits: ['close'],
    template: `
      <teleport to="body">
        <div class="modal-backdrop" @click.self="$emit('close')">
          <div class="modal-content">
            <slot></slot>
          </div>
        </div>
      </teleport>
    `
  };
