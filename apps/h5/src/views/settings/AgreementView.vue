<script setup lang="ts">
import RecordDetailHeader from '@/components/RecordDetailHeader.vue';
</script>

<template>
  <main class="view-page agreement-page">
    <RecordDetailHeader title="用户协议" subtitle="循形 FitTrace · 基础使用条款" />
    <article class="settings-document">
      <section>
        <h2>1. 服务内容</h2>
        <p>
          循形用于记录和查看身体数据、饮食、训练及身材照片，帮助你了解日常习惯与长期变化。请结合自己的实际情况使用各项功能。
        </p>
      </section>
      <section>
        <h2>2. 账号与个人资料</h2>
        <p>
          邮箱用于登录和接收验证信息。你可以在账号设置中修改昵称、性别和头像，性别并非必填。请保管好登录密码，不要向他人提供密码或验证码。
        </p>
        <p>发现账号异常时，可修改密码或通过登录页找回密码。修改或重置密码后，需要重新登录。</p>
      </section>
      <section>
        <h2>3. 记录与图片</h2>
        <p>
          请上传你有权使用的图片，并确认填写的信息符合实际情况。你可以在档案中查看记录，在对应页面使用编辑或删除等可用操作；退出登录不会删除已保存的记录。
        </p>
        <p>选择相册图片或拍照由你主动操作。请留意图片中是否包含不希望上传的个人信息。</p>
      </section>
      <section>
        <h2>4. AI 识别与数据参考</h2>
        <p>
          使用拍照识别时，所选图片会发送给 AI
          识别服务进行分析。食物名称、份量和热量可能存在误差，请在保存前核对并修改识别结果。
        </p>
        <p>趋势、目标进度和识别结果用于日常记录参考，不能替代专业诊断、治疗或个体化健康建议。</p>
      </section>
      <section>
        <h2>5. 使用规范</h2>
        <p>
          请遵守适用法律，尊重他人隐私与合法权益，不上传违法内容，不尝试未经授权访问他人账号、记录或服务。
        </p>
      </section>
      <section>
        <h2>6. 功能与条款更新</h2>
        <p>功能可能随应用版本调整。你可以在设置中查看本使用条款，并在“关于循形”中了解当前版本。</p>
      </section>
    </article>
  </main>
</template>

<style scoped lang="scss">
@use '@/styles/settings';
</style>
