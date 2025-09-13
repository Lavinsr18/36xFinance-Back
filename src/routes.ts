// import type { Express } from "express";
// import { createServer, type Server } from "http";
// import { storage } from "./storage";
// import { loginSchema } from "../shared/schema";
// import { z } from "zod";

// export async function registerRoutes(app: Express): Promise<Server> {
//   // Admin authentication
//   app.post("/api/auth/login", async (req, res) => {
//     try {
//       const { email, password } = loginSchema.parse(req.body);
      
//       const adminUser = await storage.getAdminUserByEmail(email);
//       if (!adminUser || adminUser.password !== password) {
//         return res.status(401).json({ message: "Invalid credentials" });
//       }

//       // In production, use proper session management
//       const { password: _, ...userWithoutPassword } = adminUser;
//       res.json({ user: userWithoutPassword });
//     } catch (error) {
//       if (error instanceof z.ZodError) {
//         return res.status(400).json({ message: "Invalid input", errors: error.errors });
//       }
//       res.status(500).json({ message: "Internal server error" });
//     }
//   });

//   // Dashboard stats
//   app.get("/api/dashboard/stats", async (_req, res) => {
//     try {
//       const stats = await storage.getDashboardStats();
//       res.json(stats);
//     } catch (error) {
//       res.status(500).json({ message: "Failed to fetch dashboard stats" });
//     }
//   });

//   // Users management
//   app.get("/api/users", async (_req, res) => {
//     try {
//       const users = await storage.getUsers();
//       res.json(users);
//     } catch (error) {
//       res.status(500).json({ message: "Failed to fetch users" });
//     }
//   });

//   app.patch("/api/users/:id/status", async (req, res) => {
//     try {
//       const { id } = req.params;
//       const { status } = req.body;
      
//       const updatedUser = await storage.updateUserStatus(id, status);
//       if (!updatedUser) {
//         return res.status(404).json({ message: "User not found" });
//       }
      
//       res.json(updatedUser);
//     } catch (error) {
//       res.status(500).json({ message: "Failed to update user status" });
//     }
//   });

//   // Transactions
//   app.get("/api/transactions", async (req, res) => {
//     try {
//       const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
//       const transactions = await storage.getTransactions(limit);
      
//       // Join with user data
//       const transactionsWithUsers = await Promise.all(
//         transactions.map(async (transaction) => {
//           const user = await storage.getUser(transaction.userId);
//           return {
//             ...transaction,
//             user: user ? {
//               id: user.id,
//               username: user.username,
//               email: user.email,
//               fullName: user.fullName,
//             } : null,
//           };
//         })
//       );
      
//       res.json(transactionsWithUsers);
//     } catch (error) {
//       res.status(500).json({ message: "Failed to fetch transactions" });
//     }
//   });

//   app.patch("/api/transactions/:id/status", async (req, res) => {
//     try {
//       const { id } = req.params;
//       const { status } = req.body;
      
//       const updatedTransaction = await storage.updateTransactionStatus(id, status);
//       if (!updatedTransaction) {
//         return res.status(404).json({ message: "Transaction not found" });
//       }
      
//       res.json(updatedTransaction);
//     } catch (error) {
//       res.status(500).json({ message: "Failed to update transaction status" });
//     }
//   });

//   // Revenue chart data (mock data for charts)
//   app.get("/api/dashboard/revenue-chart", async (_req, res) => {
//     try {
//       const data = [
//         { month: "Jan", revenue: 65000 },
//         { month: "Feb", revenue: 59000 },
//         { month: "Mar", revenue: 80000 },
//         { month: "Apr", revenue: 81000 },
//         { month: "May", revenue: 56000 },
//         { month: "Jun", revenue: 85000 },
//       ];
//       res.json(data);
//     } catch (error) {
//       res.status(500).json({ message: "Failed to fetch revenue chart data" });
//     }
//   });

//   // User activity chart data
//   app.get("/api/dashboard/activity-chart", async (_req, res) => {
//     try {
//       const data = [
//         { day: "Mon", users: 1200 },
//         { day: "Tue", users: 1900 },
//         { day: "Wed", users: 3000 },
//         { day: "Thu", users: 5000 },
//         { day: "Fri", users: 2000 },
//         { day: "Sat", users: 3000 },
//         { day: "Sun", users: 2500 },
//       ];
//       res.json(data);
//     } catch (error) {
//       res.status(500).json({ message: "Failed to fetch activity chart data" });
//     }
//   });

//   const httpServer = createServer(app);
//   return httpServer;
// }



import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema,
  insertBlogSchema, 
  insertVideoSchema, 
  insertContactSchema, 
  insertEnquiryFormSchema 
} from "../shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Find user by username
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ success: false, message: "Account is disabled" });
      }
      
      // Check password (in production, this should be hashed)
      if (user.password !== password) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }
      
      // Track login
      const ipAddress = req.ip || req.connection.remoteAddress || "127.0.0.1";
      const userAgent = req.get('User-Agent') || "Unknown";
      await storage.updateUserLogin(user.id, ipAddress, userAgent);
      
      res.json({ 
        success: true, 
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // Users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.put("/api/users/:id/permissions", async (req, res) => {
    try {
      const { permissions } = req.body;
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: "Permissions must be an array" });
      }
      const user = await storage.updateUserPermissions(req.params.id, permissions);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user permissions" });
    }
  });

  app.put("/api/users/:id/status", async (req, res) => {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }
      const user = await storage.updateUserStatus(req.params.id, isActive);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Login History
  app.get("/api/login-history", async (req, res) => {
    try {
      const { userId } = req.query;
      let history;
      
      if (userId && typeof userId === 'string') {
        history = await storage.getUserLoginHistory(userId);
      } else {
        history = await storage.getAllLoginHistory();
      }
      
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch login history" });
    }
  });

  // Blogs
  app.get("/api/blogs", async (req, res) => {
    try {
      const { search } = req.query;
      let blogs;
      
      if (search && typeof search === 'string') {
        blogs = await storage.searchBlogs(search);
      } else {
        blogs = await storage.getAllBlogs();
      }
      
      res.json(blogs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blogs" });
    }
  });

  app.get("/api/blogs/:id", async (req, res) => {
    try {
      const blog = await storage.getBlog(req.params.id);
      if (!blog) {
        return res.status(404).json({ message: "Blog not found" });
      }
      res.json(blog);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blog" });
    }
  });

  app.post("/api/blogs", async (req, res) => {
    try {
      const blogData = insertBlogSchema.parse(req.body);
      const blog = await storage.createBlog(blogData);
      res.status(201).json(blog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid blog data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create blog" });
    }
  });

  app.put("/api/blogs/:id", async (req, res) => {
    try {
      const blogData = insertBlogSchema.partial().parse(req.body);
      const blog = await storage.updateBlog(req.params.id, blogData);
      if (!blog) {
        return res.status(404).json({ message: "Blog not found" });
      }
      res.json(blog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid blog data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update blog" });
    }
  });

  app.delete("/api/blogs/:id", async (req, res) => {
    try {
      const success = await storage.deleteBlog(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Blog not found" });
      }
      res.json({ message: "Blog deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete blog" });
    }
  });

  // Videos
  app.get("/api/videos", async (req, res) => {
    try {
      const { search } = req.query;
      let videos;
      
      if (search && typeof search === 'string') {
        videos = await storage.searchVideos(search);
      } else {
        videos = await storage.getAllVideos();
      }
      
      res.json(videos);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.get("/api/videos/:id", async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch video" });
    }
  });

  app.post("/api/videos", async (req, res) => {
    try {
      const videoData = insertVideoSchema.parse(req.body);
      const video = await storage.createVideo(videoData);
      res.status(201).json(video);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid video data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create video" });
    }
  });

  app.put("/api/videos/:id", async (req, res) => {
    try {
      const videoData = insertVideoSchema.partial().parse(req.body);
      const video = await storage.updateVideo(req.params.id, videoData);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid video data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update video" });
    }
  });

  app.delete("/api/videos/:id", async (req, res) => {
    try {
      const success = await storage.deleteVideo(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json({ message: "Video deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete video" });
    }
  });

  // Contacts
  app.get("/api/contacts", async (req, res) => {
    try {
      const contacts = await storage.getAllContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const contactData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(contactData);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  // Enquiry Forms
  app.get("/api/enquiry-forms", async (req, res) => {
    try {
      const forms = await storage.getAllEnquiryForms();
      res.json(forms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enquiry forms" });
    }
  });

  app.post("/api/enquiry-forms", async (req, res) => {
    try {
      const formData = insertEnquiryFormSchema.parse(req.body);
      const form = await storage.createEnquiryForm(formData);
      res.status(201).json(form);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid form data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create enquiry form" });
    }
  });

  app.put("/api/enquiry-forms/:id", async (req, res) => {
    try {
      const formData = insertEnquiryFormSchema.partial().parse(req.body);
      const form = await storage.updateEnquiryForm(req.params.id, formData);
      if (!form) {
        return res.status(404).json({ message: "Enquiry form not found" });
      }
      res.json(form);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid form data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update enquiry form" });
    }
  });

  app.delete("/api/enquiry-forms/:id", async (req, res) => {
    try {
      const success = await storage.deleteEnquiryForm(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Enquiry form not found" });
      }
      res.json({ message: "Enquiry form deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete enquiry form" });
    }
  });

  // Activities
  app.get("/api/activities", async (req, res) => {
    try {
      const activities = await storage.getAllActivities();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Excel Export
  app.get("/api/export/contacts", async (req, res) => {
    try {
      const contacts = await storage.getAllContacts();
      
      // Simple CSV format for Excel compatibility
      const csvHeader = "First Name,Last Name,Email,Phone,Subject,Message,Date\n";
      const csvRows = contacts.map(contact => 
        `"${contact.firstName}","${contact.lastName}","${contact.email}","${contact.phone || ''}","${contact.subject}","${contact.message}","${contact.createdAt?.toISOString() || ''}"`
      ).join("\n");
      
      const csv = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Failed to export contacts" });
    }
  });

  app.get("/api/export/enquiries", async (req, res) => {
    try {
      const forms = await storage.getAllEnquiryForms();
      
      // Simple CSV format for Excel compatibility
      const csvHeader = "Title,Description,Google Form URL,Features,Status,Created Date\n";
      const csvRows = forms.map(form => 
        `"${form.title}","${form.description}","${form.googleFormUrl}","${form.features?.join('; ') || ''}","${form.isActive ? 'Active' : 'Inactive'}","${form.createdAt?.toISOString() || ''}"`
      ).join("\n");
      
      const csv = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="enquiry-forms.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Failed to export enquiry forms" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
