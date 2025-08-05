"use client"
import React from "react"
import { Button, Drawer } from "@medusajs/ui"

interface CircularMenuModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

const CircularMenuModal = ({ isOpen, onClose, title, children }: CircularMenuModalProps) => {
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <Drawer.Content className="z-50 h-[50%] w-[80%] max-w-md mr-[50%] bg-gray-900 text-white border-r border-gray-700 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
        <Drawer.Header className="border-b border-gray-700">
          <Drawer.Title className="text-xl font-bold text-white">{title}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="p-6 bg-gray-900">
          {children}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}

export default CircularMenuModal
