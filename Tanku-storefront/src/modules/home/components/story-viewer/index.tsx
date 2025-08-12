"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { XMark, ChevronLeft, ChevronRight } from "@medusajs/icons"
import { Story, StoryMedia } from '../story-upload'

interface StoryViewerProps {
  stories: Story[]
  currentStoryIndex: number
  onClose: () => void
  onStoryChange: (index: number) => void
}

const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  currentStoryIndex,
  onClose,
  onStoryChange
}) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const currentStory = stories[currentStoryIndex]

  // Reset media index when story changes
  useEffect(() => {
    setCurrentMediaIndex(0)
  }, [currentStoryIndex])

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      onStoryChange(currentStoryIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentStoryIndex < stories.length - 1) {
      onStoryChange(currentStoryIndex + 1)
    } else {
      onClose()
    }
  }



  if (!currentStory) return null

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">


      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <Image
              src={currentStory.avatar}
              alt={currentStory.name}
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-white font-medium text-sm">{currentStory.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300 transition-colors"
        >
          <XMark className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation areas */}
      <div className="absolute inset-0 flex">
        {/* Left tap area */}
        <div
          className="flex-1 cursor-pointer flex items-center justify-start pl-4"
          onClick={handlePrevious}
        >
          {currentStoryIndex > 0 && (
            <div className="opacity-0 hover:opacity-100 transition-opacity">
              <ChevronLeft className="w-8 h-8 text-white" />
            </div>
          )}
        </div>

        {/* Right tap area */}
        <div
          className="flex-1 cursor-pointer flex items-center justify-end pr-4"
          onClick={handleNext}
        >
          <div className="opacity-0 hover:opacity-100 transition-opacity">
            <ChevronRight className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Story Content */}
      <div className="w-full h-full flex items-center justify-center">
        {currentStory.media && currentStory.media.length > 0 ? (
          <div className="relative w-full h-full max-w-md max-h-full">
            {/* Current Media Display */}
            {currentStory.media[currentMediaIndex].type === 'image' ? (
              <Image
                src={currentStory.media[currentMediaIndex].url}
                alt={currentStory.title || 'Story'}
                fill
                className="object-contain"
                priority
              />
            ) : (
              <video
                src={currentStory.media[currentMediaIndex].url}
                autoPlay
                muted
                className="w-full h-full object-contain"
              />
            )}
            
            {/* Media Navigation for Multiple Files */}
            {currentStory.media.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentMediaIndex(prev => prev > 0 ? prev - 1 : currentStory.media!.length - 1)}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 transition-opacity z-10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setCurrentMediaIndex(prev => prev < currentStory.media!.length - 1 ? prev + 1 : 0)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 transition-opacity z-10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                
                {/* Media Dots Indicator */}
                <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {currentStory.media.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentMediaIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentMediaIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
            
            {/* Story text overlay */}
            {(currentStory.title || currentStory.description) && (
              <div className="absolute bottom-20 left-4 right-4 bg-black bg-opacity-50 rounded-lg p-4">
                {currentStory.title && (
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {currentStory.title}
                  </h3>
                )}
                {currentStory.description && (
                  <p className="text-gray-200 text-sm">
                    {currentStory.description}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Default story placeholder */
          <div className="w-full max-w-md h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4">
                <Image
                  src={currentStory.avatar}
                  alt={currentStory.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-white text-xl font-semibold">{currentStory.name}</p>
              <p className="text-gray-200 text-sm mt-2">Historia sin contenido</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-4 right-4 text-center">
        <p className="text-gray-300 text-xs">
          {currentStoryIndex + 1} de {stories.length}
        </p>
      </div>
    </div>
  )
}

export default StoryViewer
