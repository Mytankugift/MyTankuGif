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
      <div className="absolute top-2 sm:top-3 md:top-4 left-2 sm:left-3 md:left-4 right-2 sm:right-3 md:right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden">
            <Image
              src={currentStory.avatar}
              alt={currentStory.name}
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-white font-medium text-xs sm:text-sm">{currentStory.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300 transition-colors p-1"
          aria-label="Cerrar"
        >
          <XMark className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Navigation areas */}
      <div className="absolute inset-0 flex">
        {/* Left tap area */}
        <div
          className="flex-1 cursor-pointer flex items-center justify-start pl-2 sm:pl-3 md:pl-4"
          onClick={handlePrevious}
        >
          {currentStoryIndex > 0 && (
            <div className="opacity-0 hover:opacity-100 transition-opacity">
              <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
            </div>
          )}
        </div>

        {/* Right tap area */}
        <div
          className="flex-1 cursor-pointer flex items-center justify-end pr-2 sm:pr-3 md:pr-4"
          onClick={handleNext}
        >
          <div className="opacity-0 hover:opacity-100 transition-opacity">
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Story Content */}
      <div className="w-full h-full flex items-center justify-center px-2 sm:px-4">
        {currentStory.media && currentStory.media.length > 0 ? (
          <div className="relative w-full h-full max-w-xs sm:max-w-sm md:max-w-md max-h-[85vh] sm:max-h-[90vh]">
            {/* Current Media Display */}
            {currentStory.media[currentMediaIndex].type === 'image' ? (
              <div className="relative w-full h-full">
                <Image
                  src={currentStory.media[currentMediaIndex].url}
                  alt={currentStory.title || 'Story'}
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 80vw, 700px"
                />
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  src={currentStory.media[currentMediaIndex].url}
                  autoPlay
                  muted
                  playsInline
                  controls={false}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            
            {/* Media Navigation for Multiple Files */}
            {currentStory.media.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentMediaIndex(prev => prev > 0 ? prev - 1 : currentStory.media!.length - 1)}
                  className="absolute left-2 sm:left-3 md:left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center hover:bg-opacity-70 transition-opacity z-10"
                  aria-label="Media anterior"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </button>
                <button
                  onClick={() => setCurrentMediaIndex(prev => prev < currentStory.media!.length - 1 ? prev + 1 : 0)}
                  className="absolute right-2 sm:right-3 md:right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center hover:bg-opacity-70 transition-opacity z-10"
                  aria-label="Media siguiente"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </button>
                
                {/* Media Dots Indicator */}
                <div className="absolute bottom-24 sm:bottom-28 md:bottom-32 left-1/2 transform -translate-x-1/2 flex gap-1 sm:gap-2">
                  {currentStory.media.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentMediaIndex(index)}
                      className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors ${
                        index === currentMediaIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                      }`}
                      aria-label={`Ver media ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
            
            {/* Story text overlay */}
            {(currentStory.title || currentStory.description) && (
              <div className="absolute bottom-16 sm:bottom-18 md:bottom-20 left-2 sm:left-3 md:left-4 right-2 sm:right-3 md:right-4 bg-black bg-opacity-50 rounded-lg p-2 sm:p-3 md:p-4">
                {currentStory.title && (
                  <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg mb-1 sm:mb-2 line-clamp-2">
                    {currentStory.title}
                  </h3>
                )}
                {currentStory.description && (
                  <p className="text-gray-200 text-xs sm:text-sm line-clamp-3 sm:line-clamp-4">
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
