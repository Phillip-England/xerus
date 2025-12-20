import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";

export function validation(app: Xerus) {
  
  // 1. JSON Validation (Using Class-based Route with callback)
  const signupRoute = new Route("POST", "/validation/signup", async (c) => {
      const user = c.validJSON; // Access valid data
      
      c.json({
        status: "success",
        user: { 
          name: user.username, 
          email: user.email,
          age: user.age
        }
      });
  });

  // Attach validation logic
  signupRoute.validateJSON(async (data) => {
      const schema = z.object({
        username: z.string().min(3, "Username must be at least 3 chars"),
        email: z.email("Invalid email format"),
        age: z.number().min(18, "Must be 18 or older"),
      });
      return await schema.parseAsync(data);
  });

  app.mount(signupRoute);


  // 2. Query Param Validation
  const searchRoute = new Route("GET", "/validation/search", async (c) => {
      const query = c.validQuery; // Access valid query
      c.json({
        status: "success",
        search: { q: query.query, limit: query.limit }
      });
  });

  searchRoute.validateQuery(async (data) => {
      // Manual transformation + Zod
      const formatted = {
          query: data.q || "",
          limit: Number(data.limit) || 10
      };

      const schema = z.object({
        query: z.string().min(1, "Search query is required"),
        limit: z.number().max(100, "Limit cannot exceed 100"),
      });
      
      return await schema.parseAsync(formatted);
  });

  app.mount(searchRoute);


  // 3. Form Data Validation
  const loginRoute = new Route("POST", "/validation/login", async (c) => {
      const form = c.validForm;
      c.json({
        status: "success",
        msg: `Welcome ${form.username}`
      });
  });

  loginRoute.validateForm((data) => {
      // Simple manual validation without Zod
      const user = data.username;
      const pass = data.password;

      if(!user || !pass) throw new Error("Missing credentials");
      if(pass.length < 6) throw new Error("Password too short");
      
      return data;
  });

  app.mount(loginRoute);
}