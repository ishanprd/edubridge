'use client'

import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

const CustomAlertDialog = ({
  open,
  onOpenChange,
  title,
  description,
  showCancelButton = true,
  inputPlaceholder,
  buttons
}) => {
  const [inputValue, setInputValue] = useState("");
  const showInput = !!inputPlaceholder;

  const handleClose = () => {
    setInputValue("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description &&
            <AlertDialogDescription>
                {description}
            </AlertDialogDescription>
          }
        </AlertDialogHeader>
        {showInput && (
          <div className="px-6 pb-4">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full"
            />
          </div>
        )}
        <AlertDialogFooter>
          {showCancelButton && (
            <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
          )}
          {buttons.map((button, index) => (
            <AlertDialogAction
              key={index}
              onClick={() => {
                button.function(showInput ? inputValue : undefined);
                handleClose();
              }}
              className={button.color ? button.color : 'bg-primary text-white'}
            >
              {button.title}
            </AlertDialogAction>
          ))}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CustomAlertDialog;