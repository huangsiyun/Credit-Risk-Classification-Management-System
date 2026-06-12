package com.hoico.util;

import com.hoico.dao.UserDAO;
import com.hoico.model.User;
import org.springframework.context.ApplicationContext;
import org.springframework.context.support.ClassPathXmlApplicationContext;

public class DatabaseChecker {
    public static void main(String[] args) {
        // 加载Spring配置文件
        ApplicationContext context = new ClassPathXmlApplicationContext("applicationContext.xml");
        
        // 获取UserDAO实例
        UserDAO userDAO = context.getBean(UserDAO.class);
        
        // 查询所有用户（假设UserDAO有这个方法）
        System.out.println("Checking database users...");
        
        // 查询管理员用户
        User adminUser = userDAO.findByUsername("admin");
        if (adminUser != null) {
            System.out.println("Admin user found:");
            System.out.println("ID: " + adminUser.getId());
            System.out.println("Username: " + adminUser.getUsername());
            System.out.println("Role: " + adminUser.getRole());
            System.out.println("Password (encrypted): " + adminUser.getPassword());
        } else {
            System.out.println("No admin user found!");
        }
        
        // 查询测试用户
        User testUser = userDAO.findByUsername("test");
        if (testUser != null) {
            System.out.println("\nTest user found:");
            System.out.println("ID: " + testUser.getId());
            System.out.println("Username: " + testUser.getUsername());
            System.out.println("Role: " + testUser.getRole());
        }
        
        // 关闭Spring容器
        ((ClassPathXmlApplicationContext) context).close();
    }
}
