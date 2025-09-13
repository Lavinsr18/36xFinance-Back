import { 
  type User, 
  type InsertUser, 
  type LoginHistory,
  type InsertLoginHistory,
  type Blog, 
  type InsertBlog,
  type Video,
  type InsertVideo,
  type Contact,
  type InsertContact,
  type EnquiryForm,
  type InsertEnquiryForm,
  type Activity,
  type InsertActivity
} from "../shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  updateUserPermissions(id: string, permissions: string[]): Promise<User | undefined>;
  updateUserStatus(id: string, isActive: boolean): Promise<User | undefined>;
  updateUserLogin(id: string, ipAddress?: string, userAgent?: string): Promise<void>;

  // Login History
  getAllLoginHistory(): Promise<LoginHistory[]>;
  getUserLoginHistory(userId: string): Promise<LoginHistory[]>;
  createLoginHistory(loginHistory: InsertLoginHistory): Promise<LoginHistory>;

  // Blogs
  getAllBlogs(): Promise<Blog[]>;
  getBlog(id: string): Promise<Blog | undefined>;
  createBlog(blog: InsertBlog): Promise<Blog>;
  updateBlog(id: string, blog: Partial<InsertBlog>): Promise<Blog | undefined>;
  deleteBlog(id: string): Promise<boolean>;
  searchBlogs(query: string): Promise<Blog[]>;

  // Videos
  getAllVideos(): Promise<Video[]>;
  getVideo(id: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, video: Partial<InsertVideo>): Promise<Video | undefined>;
  deleteVideo(id: string): Promise<boolean>;
  searchVideos(query: string): Promise<Video[]>;

  // Contacts
  getAllContacts(): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;

  // Enquiry Forms
  getAllEnquiryForms(): Promise<EnquiryForm[]>;
  getEnquiryForm(id: string): Promise<EnquiryForm | undefined>;
  createEnquiryForm(form: InsertEnquiryForm): Promise<EnquiryForm>;
  updateEnquiryForm(id: string, form: Partial<InsertEnquiryForm>): Promise<EnquiryForm | undefined>;
  deleteEnquiryForm(id: string): Promise<boolean>;

  // Activities
  getAllActivities(): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private loginHistory: Map<string, LoginHistory>;
  private blogs: Map<string, Blog>;
  private videos: Map<string, Video>;
  private contacts: Map<string, Contact>;
  private enquiryForms: Map<string, EnquiryForm>;
  private activities: Map<string, Activity>;

  constructor() {
    this.users = new Map();
    this.loginHistory = new Map();
    this.blogs = new Map();
    this.videos = new Map();
    this.contacts = new Map();
    this.enquiryForms = new Map();
    this.activities = new Map();

    // Initialize with admin user
    const adminUser: User = {
      id: randomUUID(),
      username: "36xfinance",
      password: "36xfinance",
      email: "admin@36xfinance.com",
      role: "admin",
      isActive: true,
      permissions: ["blogs", "videos", "contacts", "enquiries", "users", "activities"],
      lastLogin: null,
      loginCount: "0",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(adminUser.id, adminUser);

    // Initialize with default enquiry forms
    const defaultForm1: EnquiryForm = {
      id: randomUUID(),
      title: "Business Registration",
      description: "Complete business registration and incorporation services with expert guidance throughout the process.",
      icon: "💼",
      image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=300",
      googleFormUrl: "https://forms.gle/eBrRUfpQHTu4A3Jk9",
      features: ["Company Registration", "Tax ID Application", "Legal Documentation"],
      isActive: true,
      createdAt: new Date()
    };

    const defaultForm2: EnquiryForm = {
      id: randomUUID(),
      title: "Tax Consultation",
      description: "Personalized tax planning and consultation services to optimize your tax strategy and compliance.",
      icon: "📊",
      image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=300",
      googleFormUrl: "https://forms.gle/uepyC8iEHpUJcwsX6",
      features: ["Tax Planning Strategy", "Compliance Review", "Deduction Optimization"],
      isActive: true,
      createdAt: new Date()
    };

    this.enquiryForms.set(defaultForm1.id, defaultForm1);
    this.enquiryForms.set(defaultForm2.id, defaultForm2);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      lastLogin: null,
      loginCount: "0",
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, user);
    
    // Create activity
    await this.createActivity({
      type: "user",
      action: "created",
      title: `New user "${user.username}" was created`
    });
    
    return user;
  }

  async updateUser(id: string, updateUser: Partial<InsertUser>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    
    const updated: User = { 
      ...existing, 
      ...updateUser, 
      updatedAt: new Date() 
    };
    this.users.set(id, updated);
    
    // Create activity
    await this.createActivity({
      type: "user",
      action: "updated",
      title: `User "${updated.username}" was updated`
    });
    
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    
    this.users.delete(id);
    
    // Create activity
    await this.createActivity({
      type: "user",
      action: "deleted",
      title: `User "${user.username}" was deleted`
    });
    
    return true;
  }

  async updateUserPermissions(id: string, permissions: string[]): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    
    const updated: User = { 
      ...existing, 
      permissions, 
      updatedAt: new Date() 
    };
    this.users.set(id, updated);
    
    // Create activity
    await this.createActivity({
      type: "user",
      action: "updated",
      title: `Permissions updated for user "${updated.username}"`
    });
    
    return updated;
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    
    const updated: User = { 
      ...existing, 
      isActive, 
      updatedAt: new Date() 
    };
    this.users.set(id, updated);
    
    // Create activity
    await this.createActivity({
      type: "user",
      action: "updated",
      title: `User "${updated.username}" was ${isActive ? 'activated' : 'deactivated'}`
    });
    
    return updated;
  }

  async updateUserLogin(id: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const existing = this.users.get(id);
    if (!existing) return;
    
    const loginCount = (parseInt(existing.loginCount || "0") + 1).toString();
    const updated: User = { 
      ...existing, 
      lastLogin: new Date(),
      loginCount,
      updatedAt: new Date() 
    };
    this.users.set(id, updated);
    
    // Create login history entry
    await this.createLoginHistory({
      userId: id,
      username: existing.username,
      ipAddress: ipAddress || "127.0.0.1",
      userAgent: userAgent || "Unknown"
    });
  }

  // Login History
  async getAllLoginHistory(): Promise<LoginHistory[]> {
    return Array.from(this.loginHistory.values()).sort((a, b) => 
      new Date(b.loginTime!).getTime() - new Date(a.loginTime!).getTime()
    );
  }

  async getUserLoginHistory(userId: string): Promise<LoginHistory[]> {
    return Array.from(this.loginHistory.values())
      .filter(entry => entry.userId === userId)
      .sort((a, b) => 
        new Date(b.loginTime!).getTime() - new Date(a.loginTime!).getTime()
      );
  }

  async createLoginHistory(insertLoginHistory: InsertLoginHistory): Promise<LoginHistory> {
    const id = randomUUID();
    const loginHistory: LoginHistory = { 
      ...insertLoginHistory, 
      id, 
      loginTime: new Date() 
    };
    this.loginHistory.set(id, loginHistory);
    return loginHistory;
  }

  // Blogs
  async getAllBlogs(): Promise<Blog[]> {
    return Array.from(this.blogs.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getBlog(id: string): Promise<Blog | undefined> {
    return this.blogs.get(id);
  }

  async createBlog(insertBlog: InsertBlog): Promise<Blog> {
    const id = randomUUID();
    const now = new Date();
    const blog: Blog = { 
      ...insertBlog, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.blogs.set(id, blog);
    
    // Create activity
    await this.createActivity({
      type: "blog",
      action: "created",
      title: `New blog "${blog.title}" was created`
    });
    
    return blog;
  }

  async updateBlog(id: string, updateBlog: Partial<InsertBlog>): Promise<Blog | undefined> {
    const existing = this.blogs.get(id);
    if (!existing) return undefined;
    
    const updated: Blog = { 
      ...existing, 
      ...updateBlog, 
      updatedAt: new Date() 
    };
    this.blogs.set(id, updated);
    
    // Create activity
    await this.createActivity({
      type: "blog",
      action: "updated",
      title: `Blog "${updated.title}" was updated`
    });
    
    return updated;
  }

  async deleteBlog(id: string): Promise<boolean> {
    const blog = this.blogs.get(id);
    if (!blog) return false;
    
    this.blogs.delete(id);
    
    // Create activity
    await this.createActivity({
      type: "blog",
      action: "deleted",
      title: `Blog "${blog.title}" was deleted`
    });
    
    return true;
  }

  async searchBlogs(query: string): Promise<Blog[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.blogs.values()).filter(blog =>
      blog.title.toLowerCase().includes(lowercaseQuery) ||
      blog.content.toLowerCase().includes(lowercaseQuery) ||
      blog.category.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Videos
  async getAllVideos(): Promise<Video[]> {
    return Array.from(this.videos.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getVideo(id: string): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const id = randomUUID();
    const video: Video = { 
      ...insertVideo, 
      id, 
      createdAt: new Date() 
    };
    this.videos.set(id, video);
    
    // Create activity
    await this.createActivity({
      type: "video",
      action: "created",
      title: `New video "${video.title}" was added`
    });
    
    return video;
  }

  async updateVideo(id: string, updateVideo: Partial<InsertVideo>): Promise<Video | undefined> {
    const existing = this.videos.get(id);
    if (!existing) return undefined;
    
    const updated: Video = { ...existing, ...updateVideo };
    this.videos.set(id, updated);
    
    // Create activity
    await this.createActivity({
      type: "video",
      action: "updated",
      title: `Video "${updated.title}" was updated`
    });
    
    return updated;
  }

  async deleteVideo(id: string): Promise<boolean> {
    const video = this.videos.get(id);
    if (!video) return false;
    
    this.videos.delete(id);
    
    // Create activity
    await this.createActivity({
      type: "video",
      action: "deleted",
      title: `Video "${video.title}" was deleted`
    });
    
    return true;
  }

  async searchVideos(query: string): Promise<Video[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.videos.values()).filter(video =>
      video.title.toLowerCase().includes(lowercaseQuery) ||
      video.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Contacts
  async getAllContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = { 
      ...insertContact, 
      id, 
      createdAt: new Date() 
    };
    this.contacts.set(id, contact);
    
    // Create activity
    await this.createActivity({
      type: "contact",
      action: "created",
      title: `New contact message from ${contact.firstName} ${contact.lastName}`
    });
    
    return contact;
  }

  // Enquiry Forms
  async getAllEnquiryForms(): Promise<EnquiryForm[]> {
    return Array.from(this.enquiryForms.values()).filter(form => form.isActive);
  }

  async getEnquiryForm(id: string): Promise<EnquiryForm | undefined> {
    return this.enquiryForms.get(id);
  }

  async createEnquiryForm(insertForm: InsertEnquiryForm): Promise<EnquiryForm> {
    const id = randomUUID();
    const form: EnquiryForm = { 
      ...insertForm, 
      id, 
      createdAt: new Date() 
    };
    this.enquiryForms.set(id, form);
    
    // Create activity
    await this.createActivity({
      type: "enquiry",
      action: "created",
      title: `New enquiry form "${form.title}" was created`
    });
    
    return form;
  }

  async updateEnquiryForm(id: string, updateForm: Partial<InsertEnquiryForm>): Promise<EnquiryForm | undefined> {
    const existing = this.enquiryForms.get(id);
    if (!existing) return undefined;
    
    const updated: EnquiryForm = { ...existing, ...updateForm };
    this.enquiryForms.set(id, updated);
    
    // Create activity
    await this.createActivity({
      type: "enquiry",
      action: "updated",
      title: `Enquiry form "${updated.title}" was updated`
    });
    
    return updated;
  }

  async deleteEnquiryForm(id: string): Promise<boolean> {
    const form = this.enquiryForms.get(id);
    if (!form) return false;
    
    this.enquiryForms.delete(id);
    
    // Create activity
    await this.createActivity({
      type: "enquiry",
      action: "deleted",
      title: `Enquiry form "${form.title}" was deleted`
    });
    
    return true;
  }

  // Activities
  async getAllActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    ).slice(0, 10); // Return only latest 10 activities
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const activity: Activity = { 
      ...insertActivity, 
      id, 
      createdAt: new Date() 
    };
    this.activities.set(id, activity);
    return activity;
  }
}

export const storage = new MemStorage();
