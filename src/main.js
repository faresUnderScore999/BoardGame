import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useGameStore } from './stores/gameStore'

const app = createApp(App)

app.use(createPinia())
app.use(router)

router.beforeEach((to) => {
  const store = useGameStore()
  if (to.path === '/' || to.path === '/game') {
    store.connect()
  }
})

app.mount('#app')
