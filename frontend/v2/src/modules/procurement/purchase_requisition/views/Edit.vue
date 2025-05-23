<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #header>
          <Panel :toggleable="false">
            <template #header>
              <p class="font-bold text-2xl w-10">Page Title</p>
            </template>
            <template #icons>
              <Button
                class="p-button-info p-button-rounded p-button-raised button-sm"
                @click="accountAdd"
                ><span class="material-icons">add</span> Any Navigation</Button
              >
            </template>
          </Panel>
        </template>
        <template #content>
          <div class="grid">
            <div class="col-12 form-mode">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
              exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
              dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
              mollit anim id est laborum.
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>
<script lang="ts"></script>
