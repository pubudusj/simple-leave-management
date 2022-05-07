<template>
  <div id="app">
    <h1>Simple Leave System powered by AWS Serverless</h1>
    <div class="row">
      <div class="col">
      </div>
      <div class="col">
        <CreateLeave />
      </div>
      <div class="col">
      </div>
    </div>
  </div>
</template>

<script>
import CreateLeave from './components/CreateLeave.vue'

export default {
  name: 'App',
  components: {
    CreateLeave
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
