<template>
  <main class="form-signin">
    <form>
      <h1 class="h3 mb-3 fw-normal">Apply for a leave here</h1>
      <div v-if="message">
        <div class="alert" :class="'alert alert-' + message.type">
          {{ message.text }}
        </div>
      </div>
      <div class="form-floating">
        <input
          v-model="applicantEmail"
          required
          type="email"
          class="form-control"
          id="floatingInput"
        />
        <label for="floatingInput">Applicant email</label>
      </div>
      <div class="form-floating">
        <input
          v-model="approverEmail"
          required
          type="email"
          class="form-control"
          id="floatingInput"
        />
        <label for="floatingInput">Approver email</label>
      </div>
      <div class="form-floating">
        <input
          v-model="leaveStartDate"
          type="date"
          class="form-control"
          id="floatingInput"
        />
        <label for="floatingPassword">Leave start date</label>
      </div>
      <div class="form-floating">
        <input
          v-model="leaveEndDate"
          type="date"
          class="form-control"
          id="floatingInput"
        />
        <label for="floatingPassword">Leave end date</label>
      </div>
      <div class="form-floating">
        <input
          v-model="reason"
          type="text"
          class="form-control"
          id="floatingInput"
        />
        <label for="floatingPassword">Reason</label>
      </div>
      <button
        class="w-100 btn btn-lg btn-primary"
        type="button"
        @click="create"
      >
        Apply
      </button>
    </form>
  </main>
</template>

<script>
import axios from "axios";

export default {
  name: "CreateLeave",
  props: {
    msg: String,
  },
  data() {
    return {
      applicantEmail: "",
      approverEmail: "",
      leaveStartDate: "",
      leaveEndDate: "",
      reason: "",
      message: null,
    };
  },
  methods: {
    create() {
      if (!this.applicantEmail || !this.approverEmail || !this.leaveStartDate || !this.leaveEndDate || !this.reason) {
        this.message = {
          text: "All fields are required.",
          type: "danger",
        };
      } else {
        this.submit();
      }
    },
    async submit() {
      var payload = {
        applicantEmail: this.applicantEmail,
        approverEmail: this.approverEmail,
        leaveStartDate: this.leaveStartDate,
        leaveEndDate: this.leaveEndDate,
        reason: this.reason,
      };
      try {
        console.log(process.env.VUE_APP_API_BASE_URL);
        await axios.post(
          process.env.VUE_APP_API_BASE_URL,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        this.message = {
          text: "Leave request submitted successfully.",
          type: "success",
        };
      } catch (error) {
        console.log(error);
        this.message = {
          text: "Leave submission failed. Error: ", // + error.response.data.error,
          type: "danger",
        };
      }
    },
  },
};
</script>

<style scoped>
html,
body {
  height: 100%;
}

body {
  display: -ms-flexbox;
  display: -webkit-box;
  display: flex;
  -ms-flex-align: center;
  -ms-flex-pack: center;
  -webkit-box-align: center;
  align-items: center;
  -webkit-box-pack: center;
  justify-content: center;
  padding-top: 40px;
  padding-bottom: 40px;
  background-color: #f5f5f5;
}

.form-signin {
  width: 100%;
  padding: 15px;
  margin: 20px auto;
}
.form-signin .checkbox {
  font-weight: 400;
}
.form-signin .form-control {
  position: relative;
  box-sizing: border-box;
  height: auto;
  padding: 10px;
  font-size: 16px;
}
.form-signin .form-control:focus {
  z-index: 2;
}
.form-signin input[type="email"] {
  margin-bottom: -1px;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}
.form-signin input[type="password"] {
  margin-bottom: 10px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.form-signin input[type="text"] {
  margin-bottom: 10px;
}

.form-signin input[type="url"] {
  margin-bottom: 10px;
}
</style>
