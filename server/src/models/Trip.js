import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    destination: {
      state: {
        type: String,
        default: "",
        trim: true
      },
      city: {
        type: String,
        required: true,
        trim: true
      },
      country: {
        type: String,
        required: true,
        trim: true
      }
    },
    notes: {
      type: String,
      default: "",
      trim: true
    },
    category: {
      type: String,
      enum: ["Leisure", "Business", "Foodie", "Adventure", "Family", "Other"],
      default: "Other"
    },
    preferences: {
      weather: {
        type: String,
        default: ""
      },
      dietary: {
        type: String,
        default: ""
      },
      interests: {
        type: [String],
        default: []
      }
    },
    sharedWith: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        email: {
          type: String,
          required: true,
          trim: true,
          lowercase: true
        },
        permission: {
          type: String,
          enum: ["view", "edit"],
          default: "edit"
        },
        invitedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    startDate: {
      type: String,
      required: true
    },
    endDate: {
      type: String,
      required: true
    },
    budget: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export const Trip = mongoose.model("Trip", tripSchema);
